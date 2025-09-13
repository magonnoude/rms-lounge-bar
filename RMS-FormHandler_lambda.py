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
        
        expected_api_key = os.environ.get('API_KEY_SECRET')
        
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
        
        # 🔐 VÉRIFICATION reCAPTCHA - UNIQUEMENT EN PRODUCTION ET SI CONFIGURÉ
        recaptcha_secret = os.environ.get('RECAPTCHA_SECRET_KEY')
        
        if not is_test and recaptcha_secret:
            # CORRECTION: Utiliser le bon nom de champ (recaptcha_token au lieu de recaptchaToken)
            recaptcha_token = body.get('recaptcha_token')
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
            
            print(f"🔐 reCAPTCHA secret: {'✅ Set' if recaptcha_secret else '❌ Missing'}")
            
            # CORRECTION: Utiliser la méthode POST recommandée pour reCAPTCHA
            verification_url = 'https://www.google.com/recaptcha/api/siteverify'
            post_data = urllib.parse.urlencode({
                'secret': recaptcha_secret,
                'response': recaptcha_token
            }).encode('utf-8')
            
            print(f"🌐 Verifying reCAPTCHA with URL: {verification_url}")
            
            try:
                # Utilisation de urllib avec timeout et méthode POST
                req = urllib.request.Request(verification_url, data=post_data, method='POST')
                req.add_header('Content-Type', 'application/x-www-form-urlencoded')
                
                with urllib.request.urlopen(req, timeout=10) as response:
                    response_data = response.read().decode()
                    recaptcha_data = json.loads(response_data)
                    print(f"✅ reCAPTCHA response: {recaptcha_data}")
                
                if not recaptcha_data.get('success'):
                    print(f"❌ reCAPTCHA failed: {recaptcha_data}")
                    error_codes = recaptcha_data.get('error-codes', [])
                    error_message = 'Échec de la vérification de sécurité'
                    
                    if 'timeout-or-duplicate' in error_codes:
                        error_message = 'Token reCAPTCHA expiré ou déjà utilisé'
                    elif 'missing-input-response' in error_codes:
                        error_message = 'Token reCAPTCHA manquant'
                    elif 'invalid-input-response' in error_codes:
                        error_message = 'Token reCAPTCHA invalide'
                    
                    return {
                        'statusCode': 400,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({'error': error_message})
                    }
                
                # Vérifier le score (seulement pour v3)
                score = recaptcha_data.get('score', 1.0)  # Par défaut 1.0 pour v2
                action = recaptcha_data.get('action', '')
                
                print(f"📊 reCAPTCHA score: {score}, action: {action}")
                
                if score < 0.5:  # Seuil pour v3
                    print(f"❌ reCAPTCHA score too low: {score}")
                    return {
                        'statusCode': 400,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({'error': 'Activité suspecte détectée'})
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
            print("🔓 Mode test ou reCAPTCHA non configuré - validation ignorée")
        
        # ✅ DÉTERMINATION AUTOMATIQUE DU TYPE
        # Déterminer le type en fonction des champs présents
        form_type = 'contact'  # Par défaut
        
        if 'guests' in body or 'date' in body or 'time' in body:
            form_type = 'reservation'
        elif 'subject' in body:
            form_type = 'contact'
        
        print(f"✅ Detected form type: {form_type}")
        
        # Préparer les données pour DynamoDB
        submission_id = str(uuid.uuid4())
        timestamp = datetime.utcnow().isoformat()
        
        item = {
            'submissionsId': submission_id,
            'timestamp': timestamp,
            'requestId': context.aws_request_id,
            'type': form_type  # Utiliser le type détecté automatiquement
        }
        
        # Copier tous les champs du body dans l'item
        for key, value in body.items():
            if key != 'recaptcha_token' and value is not None and value != '':
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
                if form_type == 'reservation':
                    print("📧 Sending reservation notification")
                    send_reservation_notification(item)
                elif form_type == 'contact':
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

# Fonction de notification

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

def send_event_notification(inquiry):
    """Envoyer une notification pour une demande d'événement"""
    try:
        response = ses.send_email(
            Source='noreply@grouperms.com',
            Destination={
                'ToAddresses': ['lounge@grouperms.com'] # Mettez ici l'email du manager si besoin
            },
            Message={
                'Subject': {
                    'Data': f'🎉 NOUVELLE DEMANDE DE DEVIS ÉVÉNEMENT - {inquiry.get("subject", "")}',
                    'Charset': 'UTF-8'
                },
                'Body': {
                    'Html': {
                        'Data': f"""
<html>
<body>
    <h2 style="color: #8B4513;">Nouvelle Demande de Devis pour un Événement</h2>
    <p>Une nouvelle demande importante vient d'arriver via le site web.</p>
    <hr>
    <p><strong>Nom du contact:</strong> {inquiry.get('name', 'Non spécifié')}</p>
    <p><strong>Email:</strong> {inquiry.get('email', 'Non spécifié')}</p>
    <p><strong>Sujet:</strong> {inquiry.get('subject', 'Non spécifié')}</p>
    <p><strong>Message:</strong></p>
    <div style="background-color:#f4f4f4; padding:15px; border-radius:5px;">
        <p>{inquiry.get('message', 'Aucun message')}</p>
    </div>
    <hr>
    <p><em>Il est recommandé de contacter ce prospect rapidement.</em></p>
    <p><em>ID: {inquiry.get('submissionsId', 'N/A')}</em></p>
</body>
</html>
                        """,
                        'Charset': 'UTF-8'
                    }
                }
            },
            ReplyToAddresses=[inquiry.get('email', 'noreply@grouperms.com')]
        )
        print(f"Email de demande d'événement envoyé: {response['MessageId']}")
    except Exception as e:
        print(f"Erreur lors de l'envoi de l'email d'événement: {e}")