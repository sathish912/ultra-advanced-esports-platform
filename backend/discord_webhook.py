import requests
import os
import json

# For a production app, use environment variables. We'll use a local fallback for demonstration.
DISCORD_WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL", "")

def send_discord_notification(title: str, description: str, color: int = 0x00FF3F):
    """
    Sends a rich embed message to a Discord webhook.
    color defaults to AETMS primary green.
    """
    if not DISCORD_WEBHOOK_URL:
        # Silently ignore if no webhook is configured
        print("Discord Webhook not configured. Skipping notification.")
        return

    payload = {
        "embeds": [
            {
                "title": title,
                "description": description,
                "color": color,
                "footer": {
                    "text": "AETMS Network System"
                }
            }
        ]
    }
    
    headers = {
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(DISCORD_WEBHOOK_URL, data=json.dumps(payload), headers=headers, timeout=5)
        response.raise_for_status()
    except Exception as e:
        print(f"Failed to send Discord notification: {e}")
