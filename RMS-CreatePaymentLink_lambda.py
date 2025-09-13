# lambda_final_valide.py
import json
import boto3
import os
import requests
import logging
from datetime import datetime

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('RMS-Submissions')

def lambda_handler(event, context):
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS'
    }
    
    if event['httpMethod'] == 'OPTIONS':
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({})}
    
    try:
        # Extraction des données
        submission_id = event['pathParameters']['id']
        body = json.loads(event.get('body', '{}'))
        amount = body.get('amount')
        
        if not amount or amount <= 0:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'Montant invalide.'})
            }

        # Récupération client
        response = table.get_item(Key={'submissionsId': submission_id})
        inquiry = response.get('Item')
        
        if not inquiry:
            return {
                'statusCode': 404,
                'headers': headers,
                'body': json.dumps({'error': 'Demande non trouvée.'})
            }

        # Configuration Fedapay
        fedapay_secret_key = os.environ.get('FEDAPAY_SECRET_KEY', 'sk_sandbox_szBV6l0qkWTU3kTTryCODt5E')
        fedapay_api_url = 'https://sandbox-api.fedapay.com/v1/transactions'
        
        headers_fedapay = {
            'Authorization': f'Bearer {fedapay_secret_key}',
            'Content-Type': 'application/json'
        }

        # ⭐ STRUCTURE VALIDÉE ⭐
        payload = {
            'amount': amount,
            'currency': {'iso': 'XOF'},  # Structure correcte
            'description': f'Acompte - {inquiry.get("name", "Client")}',
            'customer': {
                'email': inquiry.get('email'),
                'lastname': inquiry.get('name', ''),
                'firstname': inquiry.get('firstname', '')
            },
            'callback_url': 'https://lounge.grouperms.com/paiement-succes.html',
            'cancel_url': 'https://lounge.grouperms.com/paiement-annule.html'
        }

        # Appel Fedapay
        response = requests.post(fedapay_api_url, headers=headers_fedapay, json=payload, timeout=30)
        data = response.json()
        
        if response.status_code != 201 or 'v1/transaction' not in data:
            logger.error(f"Erreur Fedapay: {response.status_code} - {response.text}")
            return {
                'statusCode': 502,
                'headers': headers,
                'body': json.dumps({'error': 'Erreur lors de la création du paiement.'})
            }
        
        transaction = data['v1/transaction']
        
        # Mise à jour DynamoDB
        table.update_item(
            Key={'submissionsId': submission_id},
            UpdateExpression="""
                SET #s = :s, 
                    paymentUrl = :purl, 
                    transactionId = :tid, 
                    depositAmount = :amt,
                    paymentStatus = :pstatus,
                    updatedAt = :now
            """,
            ExpressionAttributeNames={'#s': 'status'},
            ExpressionAttributeValues={
                ':s': 'En attente de paiement',
                ':purl': transaction['payment_url'],
                ':tid': transaction['id'],
                ':amt': amount,
                ':pstatus': 'pending',
                ':now': datetime.now().isoformat()
            }
        )

        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'paymentUrl': transaction['payment_url'],
                'transactionId': transaction['id'],
                'message': 'Lien de paiement créé avec succès'
            })
        }

    except Exception as e:
        logger.error(f"Erreur: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': 'Erreur interne.'})
        }