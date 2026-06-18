import sys
import os

# Add backend dir to path if needed
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
import models
import random

db = SessionLocal()

try:
    user = db.query(models.User).first()
    if not user:
        print("No user found. Create a user first.")
        sys.exit()

    match = db.query(models.Match).first()
    match_id = match.id if match else None

    # Dummy video URLs (using some generic sample videos)
    sample_videos = [
        "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4",
        "https://test-videos.co.uk/vids/sintel/mp4/h264/720/Sintel_720_10s_1MB.mp4"
    ]

    for i in range(5):
        clip = models.MatchClip(
            match_id=match_id,
            clip_url=random.choice(sample_videos),
            description="Epic AI generated Match Clip!"
        )
        db.add(clip)

    db.commit()
    print("Seeded 5 dummy clips!")
finally:
    db.close()
