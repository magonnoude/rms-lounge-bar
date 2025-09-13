import json
import boto3
import uuid
from datetime import datetime
from botocore.exceptions import ClientError
import urllib.request  # Remplace requests
import os

# Initialiser les clients AWS
dynamodb = boto3.resource('dynamodb')
ses = boto3.client('ses')
table = dynamodb.Table('RMS-Submissions')

def lambda_handler(event, context):
    print(f"Event received: {event}")
    
    # Déterminer le mode (test ou production)
    is_test = not event.get('headers')  # Si pas de headers, c'est un test
    
    # Gestion différente selon si l'appel vient d'API Gateway ou de test direct
    if not is_test:
        # Appel via API Gateway (production)
        api_key = event['headers'].get('x-api-key')
        body = json.loads(event['body']) if 'body' in event else event
    else:
        # Appel direct (test) - mode développement
        api_key = None
        body = event
    
    expected_api_key = 'tLk8XDgCts3ElJrYMAbRX62p3iWYlWt1a54iZIRr'
    
    # Vérifier la clé API seulement si on est via API Gateway (production)
    if not is_test and api_key != expected_api_key:
        return {
            'statusCode': 401,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Unauthorized: Invalid API key'})
        }
    
    try:
        # 🔐 VÉRIFICATION reCAPTCHA - UNIQUEMENT EN PRODUCTION
        if not is_test:  # Mode production
            recaptcha_token = body.get('recaptchaToken')
            
            if not recaptcha_token:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'Token reCAPTCHA manquant'})
                }
            
            # Vérifier le token avec Google
            recaptcha_secret = os.environ.get('RECAPTCHA_SECRET_KEY')
            if not recaptcha_secret:
                return {
                    'statusCode': 500,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'Configuration reCAPTCHA manquante'})
                }
            
            verification_url = f'https://www.google.com/recaptcha/api/siteverify?secret={recaptcha_secret}&response={recaptcha_token}'
            
            # Utilisation de urllib au lieu de requests
            with urllib.request.urlopen(verification_url) as response:
                recaptcha_data = json.loads(response.read().decode())
            
            # Vérifier si reCAPTCHA a réussi et a un score acceptable
            if not recaptcha_data.get('success') or recaptcha_data.get('score', 0) < 0.5:
                print(f"Échec reCAPTCHA: {recaptcha_data}")
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'Échec de la vérification de sécurité'})
                }
        else:
            print("Mode test - reCAPTCHA ignoré")
        
        # ✅ Validation des données requises
        if not body.get('type'):
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Le champ "type" est requis'})
            }
        
        # Préparer les données pour DynamoDB avec la clé primaire CORRECTE
        submission_id = str(uuid.uuid4())
        timestamp = datetime.utcnow().isoformat()
        
        # Construire l'item avec la clé primaire CORRECTE (submissionsId avec "s")
        item = {
            'submissionsId': submission_id,  # CLÉ PRIMAIRE CORRECTE AVEC "S"
            'timestamp': timestamp,
            'requestId': context.aws_request_id,
            'type': body.get('type')
        }
        
        # Copier tous les champs du body dans l'item (sauf recaptchaToken)
        for key, value in body.items():
            if key != 'recaptchaToken' and value is not None and value != '':  # Ne pas inclure les valeurs vides
                item[key] = value
        
        print(f"Data to store: {item}")
        
        # Stocker les données dans DynamoDB
        table.put_item(Item=item)
        
        # Envoyer les notifications par email (uniquement en production)
        if not is_test:
            if body.get('type') == 'reservation':
                send_reservation_notification(item)
            elif body.get('type') == 'contact':
                send_contact_notification(item)
        else:
            print("Mode test - Emails non envoyés")
        
        # Réponse de succès AVEC HEADERS CORS
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,x-api-key',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            'body': json.dumps({
                'message': 'Données enregistrées avec succès',
                'submissionId': submission_id,
                'mode': 'test' if is_test else 'production'
            })
        }
        
    except ClientError as e:
        print(f"DynamoDB error: {e}")
        error_msg = str(e)
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,x-api-key',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            'body': json.dumps({'error': f'Erreur DynamoDB: {error_msg}'})
        }
    except Exception as e:
        print(f"Error: {e}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,x-api-key',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            'body': json.dumps({'error': f'Erreur interne: {str(e)}'})
        }

# Les fonctions send_reservation_notification et send_contact_notification restent identiques
def send_reservation_notification(reservation):
    """Envoyer une notification email pour une réservation"""
    try:
        # Email au restaurant
        response = ses.send_email(
            Source='noreply@grouperms.com',
            Destination={
                'ToAddresses': ['lounge@grouperms.com']
            },
            Message={
                'Subject': {
                    'Data': f'Nouvelle réservation - {reservation.get("name", "Sans nom")} - RMS Lounge Bar',
                    'Charset': 'UTF-8'
                },
                'Body': {
                    'Text': {
                        'Data': f"""
NOUVELLE RÉSERVATION - RMS LOUNGE BAR

Nom: {reservation.get('name', 'Non spécifié')}
Email: {reservation.get('email', 'Non spécifié')}
Téléphone: {reservation.get('phone', 'Non spécifié')}
Nombre de personnes: {reservation.get('guests', 'Non spécifié')}
Date: {reservation.get('date', 'Non spécifié')}
Heure: {reservation.get('time', 'Non spécifié')}
Message: {reservation.get('message', 'Aucun message')}

ID: {reservation.get('submissionsId', 'N/A')}
Horodatage: {reservation.get('timestamp', 'N/A')}
                        """,
                        'Charset': 'UTF-8'
                    },
                    'Html': {
                        'Data': f"""
<html>
<body>
    <h2>Nouvelle réservation - RMS Lounge Bar</h2>
    <p><strong>Nom:</strong> {reservation.get('name', 'Non spécifié')}</p>
    <p><strong>Email:</strong> {reservation.get('email', 'Non spécifié')}</p>
    <p><strong>Téléphone:</strong> {reservation.get('phone', 'Non spécifié')}</p>
    <p><strong>Nombre de personnes:</strong> {reservation.get('guests', 'Non spécifié')}</p>
    <p><strong>Date:</strong> {reservation.get('date', 'Non spécifié')}</p>
    <p><strong>Heure:</strong> {reservation.get('time', 'Non spécifié')}</p>
    <p><strong>Message:</strong> {reservation.get('message', 'Aucun message')}</p>
    <br>
    <p><em>ID: {reservation.get('submissionsId', 'N/A')}</em></p>
    <p><em>Horodatage: {reservation.get('timestamp', 'N/A')}</em></p>
</body>
</html>
                        """,
                        'Charset': 'UTF-8'
                    }
                }
            }
        )
        print(f"Email de réservation envoyé au restaurant: {response['MessageId']}")
        
        # Email de confirmation au client
        if reservation.get('email'):
            try:
                confirmation_response = ses.send_email(
                    Source='noreply@grouperms.com',
                    Destination={
                        'ToAddresses': [reservation.get('email')]
                    },
                    Message={
                        'Subject': {
                            'Data': 'Confirmation de votre réservation - RMS Lounge Bar',
                            'Charset': 'UTF-8'
                        },
                        'Body': {
                            'Text': {
                                'Data': f"""
CONFIRMATION DE RÉSERVATION

Cher(e) {reservation.get('name', 'Client')},

Nous avons bien reçu votre demande de réservation au RMS Lounge Bar.

Détails:
- Date: {reservation.get('date', 'Non spécifié')}
- Heure: {reservation.get('time', 'Non spécifié')}
- Personnes: {reservation.get('guests', 'Non spécifié')}
- Référence: {reservation.get('submissionsId', 'N/A')}

Nous vous contacterons dans les plus brefs délais pour confirmer votre réservation.

Cordialement,
L'équipe du RMS Lounge Bar
                                """,
                                'Charset': 'UTF-8'
                            },
                            'Html': {
                                'Data': f"""
<html>
<body>
    <h2>Confirmation de réservation - RMS Lounge Bar</h2>
    <p>Cher(e) {reservation.get('name', 'Client')},</p>
    <p>Nous avons bien reçu votre demande de réservation au RMS Lounge Bar.</p>
    
    <h3>Détails de votre réservation:</h3>
    <ul>
        <li><strong>Date:</strong> {reservation.get('date', 'Non spécifié')}</li>
        <li><strong>Heure:</strong> {reservation.get('time', 'Non spécifié')}</li>
        <li><strong>Personnes:</strong> {reservation.get('guests', 'Non spécifié')}</li>
        <li><strong>Référence:</strong> {reservation.get('submissionsId', 'N/A')}</li>
    </ul>
    
    <p>Nous vous contacterons dans les plus brefs délais pour confirmer votre réservation.</p>
    
    <p>Cordialement,<br>L'équipe du RMS Lounge Bar</p>
</body>
</html>
                                """,
                                'Charset': 'UTF-8'
                            }
                        }
                    }
                )
                print(f"Email de confirmation envoyé au client: {confirmation_response['MessageId']}")
            except Exception as e:
                print(f"Erreur lors de l'envoi de l'email de confirmation: {e}")
        
    except Exception as e:
        print(f"Erreur lors de l'envoi de l'email de réservation: {e}")

def send_contact_notification(contact):
    """Envoyer une notification email pour un contact"""
    try:
        response = ses.send_email(
            Source='noreply@grouperms.com',
            Destination={
                'ToAddresses': ['lounge@grouperms.com']
            },
            Message={
                'Subject': {
                    'Data': f'Nouveau message - {contact.get("subject", "Sans objet")} - RMS Lounge Bar',
                    'Charset': 'UTF-8'
                },
                'Body': {
                    'Text': {
                        'Data': f"""
NOUVEAU MESSAGE DE CONTACT - RMS LOUNGE BAR

Nom: {contact.get('name', 'Non spécifié')}
Email: {contact.get('email', 'Non spécifié')}
Sujet: {contact.get('subject', 'Non spécifié')}
Message: {contact.get('message', 'Aucun message')}

ID: {contact.get('submissionsId', 'N/A')}
Horodatage: {contact.get('timestamp', 'N/A')}
                        """,
                        'Charset': 'UTF-8'
                    },
                    'Html': {
                        'Data': f"""
<html>
<body>
    <h2>Nouveau message de contact - RMS Lounge Bar</h2>
    <p><strong>Nom:</strong> {contact.get('name', 'Non spécifié')}</p>
    <p><strong>Email:</strong> {contact.get('email', 'Non spécifié')}</p>
    <p><strong>Sujet:</strong> {contact.get('subject', 'Non spécifié')}</p>
    <p><strong>Message:</strong> {contact.get('message', 'Aucun message')}</p>
    <br>
    <p><em>ID: {contact.get('submissionsId', 'N/A')}</em></p>
    <p><em>Horodatage: {contact.get('timestamp', 'N/A')}</em></p>
</body>
</html>
                        """,
                        'Charset': 'UTF-8'
                    }
                }
            },
            ReplyToAddresses=[contact.get('email', 'noreply@grouperms.com')]
        )
        print(f"Email de contact envoyé: {response['MessageId']}")
    except Exception as e:
        print(f"Erreur lors de l'envoi de l'email de contact: {e}")