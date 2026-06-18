import os
import datetime
import smtplib
from email.message import EmailMessage
from dotenv import load_dotenv

from database import SessionLocal
import models

load_dotenv()

# SMTP Configuration
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_EMAIL = os.getenv("SMTP_EMAIL", "sathishkupps@gmail.com")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "uzre rpri sfoa uvja")

# Twilio Configuration
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER", "")
TWILIO_WHATSAPP_NUMBER = os.getenv("TWILIO_WHATSAPP_NUMBER", "")

# Initialize Twilio Client only if credentials are provided
try:
    from twilio.rest import Client
    if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
        twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    else:
        twilio_client = None
except ImportError:
    twilio_client = None

def log_communication(type: str, to: str, content: str, status: str = "Success"):
    try:
        db = SessionLocal()
        new_log = models.CommsLog(
            type=type,
            to=to,
            content=content,
            status=status
        )
        db.add(new_log)
        db.commit()
        db.close()
    except Exception as e:
        print(f"Failed to log communication to DB: {e}")
        
    print(f"[{type.upper()}] To: {to} | Content: {content[:50]}... | Status: {status}")

from worker import celery_app

@celery_app.task(name="send_email_task")
def send_email_task(to: str, subject: str, body: str):
    try:
        msg = EmailMessage()
        msg.set_content(body)
        msg['Subject'] = subject
        msg['From'] = SMTP_EMAIL
        msg['To'] = to

        # Connect to server and send
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_EMAIL, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        log_communication("Email", to, body, "Success")
    except Exception as e:
        print(f"Failed to send email to {to}: {e}")
        log_communication("Email", to, body, f"Failed: {e}")

def send_email(to: str, subject: str, body: str):
    # Enqueue in Celery
    send_email_task.delay(to, subject, body)

def send_sms(to: str, message: str):
    if not twilio_client or not TWILIO_PHONE_NUMBER:
        print("Twilio credentials not configured. Mocking SMS.")
        log_communication("SMS", to, message, "Mocked")
        return
        
    try:
        twilio_client.messages.create(
            body=message,
            from_=TWILIO_PHONE_NUMBER,
            to=to
        )
        log_communication("SMS", to, message, "Success")
    except Exception as e:
        print(f"Failed to send SMS to {to}: {e}")
        log_communication("SMS", to, message, f"Failed: {e}")

def send_whatsapp(to: str, message: str):
    whatsapp_sender = TWILIO_WHATSAPP_NUMBER if TWILIO_WHATSAPP_NUMBER else TWILIO_PHONE_NUMBER
    if not twilio_client or not whatsapp_sender:
        print("Twilio credentials not configured. Mocking WhatsApp.")
        log_communication("WhatsApp", to, message, "Mocked")
        return
        
    try:
        # Twilio requires "whatsapp:" prefix for WhatsApp messages
        twilio_client.messages.create(
            body=message,
            from_=f"whatsapp:{whatsapp_sender}",
            to=f"whatsapp:{to}"
        )
        log_communication("WhatsApp", to, message, "Success")
    except Exception as e:
        print(f"Failed to send WhatsApp to {to}: {e}")
        log_communication("WhatsApp", to, message, f"Failed: {e}")

def get_comms_logs():
    db = SessionLocal()
    db_logs = db.query(models.CommsLog).order_by(models.CommsLog.timestamp.desc()).limit(100).all()
    logs = [
        {
            "id": log.id,
            "timestamp": log.timestamp.strftime("%Y-%m-%d %H:%M:%S") if log.timestamp else None,
            "type": log.type,
            "to": log.to,
            "content": log.content,
            "status": log.status
        }
        for log in db_logs
    ]
    db.close()
    return logs
