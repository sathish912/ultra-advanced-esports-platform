from database import engine
from sqlalchemy import text

with engine.connect() as conn:
    try:
        conn.execute(text('ALTER TABLE trusted_devices DROP CONSTRAINT IF EXISTS "trusted_devices_device_fingerprint_key"'))
        conn.commit()
        print("Successfully dropped the unique constraint!")
    except Exception as e:
        print("Failed to drop constraint:", e)
