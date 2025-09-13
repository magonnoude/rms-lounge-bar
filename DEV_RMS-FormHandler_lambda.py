import json
import boto3
import uuid
from datetime import datetime
from botocore.exceptions import ClientError
import urllib.request
import os

# Initialiser les clients AWS
dynamodb = boto3.resource('dynamodb')
ses = boto3.client('ses')
table = dynamodb.Table('RMS-Submissions')

def lambda_handler(event, context):
    print(f"📨 Event received: {event}")
    
    try:
        # 🔍 EXTRACTION CORRECTE DES DONNÉES
        is_test = not event.get('headers')  # Si pas de headers, c'est un test
        
        print(f"🔧 Mode: {'TEST' if is_test else 'PRODUCTION'}")
        
        if not is_test:
            # Appel via API Gateway - le body est une chaîne JSON
            api_key = event['headers'].get('x-api-key')
            print(f"🔑 API Key received: {api_key}")
            
            # Extraction SÉCURISÉE du body
            if 'body' in event and event['body']:
                try:
                    body = json.loads(event['body'])
                    print(f"📦 Body parsed successfully: {body}")
                except json.JSONDecodeError as e:
                    print(f"❌ JSON decode error: {e}")
                    return {
                        'statusCode': 400,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({'error': 'Invalid JSON format'})
                    }
            else:
                print("❌ No body in event")
                body = {}
        else:
            # Appel direct (test)
            api_key = None
            body = event
            print(f"🧪 Test body: {body}")
        
        expected_api_key = 'tLk8XDgCts3ElJrYMAbRX62p3iWYlWt1a54iZIRr'
        
        # Vérifier la clé API seulement si on est via API Gateway
        if not is_test and api_key != expected_api_key:
            print(f"❌ Invalid API key. Expected: {expected_api_key}, Got: {api_key}")
            return {
                'statusCode': 401,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Unauthorized: Invalid API key'})
            }
        
        print("✅ API key validation passed")
        
        # 🔐 VÉRIFICATION reCAPTCHA - UNIQUEMENT EN PRODUCTION
        if not is_test:
            recaptcha_token = body.get('recaptchaToken')
            print(f"🔐 reCAPTCHA token: {recaptcha_token}")
            
            if not recaptcha_token:
                print("❌ Missing reCAPTCHA token")
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
            print(f"🔐 reCAPTCHA secret: {'✅ Set' if recaptcha_secret else '❌ Missing'}")
            
            if not recaptcha_secret:
                print("❌ Missing reCAPTCHA secret in environment variables")
                return {
                    'statusCode': 500,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'Configuration reCAPTCHA manquante'})
                }
            
            verification_url = f'https://www.google.com/recaptcha/api/siteverify?secret={recaptcha_secret}&response={recaptcha_token}'
            print(f"🌐 Verifying reCAPTCHA with URL: {verification_url}")
            
            try:
                # Utilisation de urllib avec timeout
                with urllib.request.urlopen(verification_url, timeout=10) as response:
                    response_data = response.read().decode()
                    recaptcha_data = json.loads(response_data)
                    print(f"✅ reCAPTCHA response: {recaptcha_data}")
                
                if not recaptcha_data.get('success') or recaptcha_data.get('score', 0) < 0.5:
                    print(f"❌ reCAPTCHA failed: {recaptcha_data}")
                    return {
                        'statusCode': 400,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({'error': 'Échec de la vérification de sécurité'})
                    }
                    
                print("✅ reCAPTCHA validation passed")
                
            except urllib.error.URLError as e:
                print(f"❌ reCAPTCHA network error: {e}")
                return {
                    'statusCode': 500,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'Erreur réseau lors de la vérification'})
                }
            except Exception as e:
                print(f"❌ reCAPTCHA unexpected error: {e}")
                return {
                    'statusCode': 500,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'Erreur lors de la vérification'})
                }
        else:
            print("🔓 Mode test - reCAPTCHA ignoré")
        
        # ✅ Validation des données requises
        if not body.get('type'):
            print("❌ Missing type field")
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Le champ "type" est requis'})
            }
        
        print(f"✅ Type field: {body.get('type')}")
        
        # Préparer les données pour DynamoDB
        submission_id = str(uuid.uuid4())
        timestamp = datetime.utcnow().isoformat()
        
        item = {
            'submissionsId': submission_id,
            'timestamp': timestamp,
            'requestId': context.aws_request_id,
            'type': body.get('type')
        }
        
        # Copier tous les champs du body dans l'item
        for key, value in body.items():
            if key != 'recaptchaToken' and value is not None and value != '':
                item[key] = value
        
        print(f"💾 Data to store: {item}")
        
        # Stocker les données dans DynamoDB
        try:
            table.put_item(Item=item)
            print("✅ Data stored in DynamoDB")
        except Exception as e:
            print(f"❌ DynamoDB error: {e}")
            raise
        
        # Envoyer les notifications par email
        if not is_test:
            try:
                if body.get('type') == 'reservation':
                    print("📧 Sending reservation notification")
                    send_reservation_notification(item)
                elif body.get('type') == 'contact':
                    print("📧 Sending contact notification")
                    send_contact_notification(item)
                print("✅ Emails sent successfully")
            except Exception as e:
                print(f"❌ Email sending error: {e}")
                # Ne pas échouer complètement à cause des emails
        else:
            print("📧 Mode test - Emails non envoyés")
        
        # Réponse de succès
        response_body = {
            'message': 'Données enregistrées avec succès',
            'submissionId': submission_id,
            'mode': 'test' if is_test else 'production'
        }
        
        print(f"✅ Success response: {response_body}")
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,x-api-key',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            'body': json.dumps(response_body)
        }
        
    except ClientError as e:
        print(f"❌ DynamoDB error: {e}")
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
        print(f"❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
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
# ... (garder le même code que précédemment)


        
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