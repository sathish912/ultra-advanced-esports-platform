from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
import random
from datetime import datetime

import models, schemas, database, auth

router = APIRouter(prefix="/streaming", tags=["Professional Streaming Infrastructure"])

import httpx
import os

TWITCH_CLIENT_ID = os.environ.get("TWITCH_CLIENT_ID", "")
TWITCH_ACCESS_TOKEN = os.environ.get("TWITCH_ACCESS_TOKEN", "")

@router.post("/sync-twitch", response_model=schemas.Stream)
def sync_twitch_stream(
    stream_data: schemas.StreamCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Syncs with Twitch API using App Access Token to verify stream status.
    Falls back to mock data if Twitch credentials are not configured.
    """
    if stream_data.platform.lower() != "twitch":
        raise HTTPException(status_code=400, detail="Use /sync-youtube for YouTube streams")
        
    twitch_user = current_user.twitch_username
    if not twitch_user:
        raise HTTPException(status_code=400, detail="Twitch username not linked to your profile")

    is_live = False
    viewer_count = 0
    title = f"{current_user.name} is playing a Tournament!"

    if TWITCH_CLIENT_ID and TWITCH_ACCESS_TOKEN:
        try:
            with httpx.Client() as client:
                headers = {
                    "Client-ID": TWITCH_CLIENT_ID,
                    "Authorization": f"Bearer {TWITCH_ACCESS_TOKEN}"
                }
                response = client.get(
                    f"https://api.twitch.tv/helix/streams?user_login={twitch_user}",
                    headers=headers
                )
                if response.status_code == 200:
                    data = response.json().get("data", [])
                    if len(data) > 0:
                        is_live = True
                        viewer_count = data[0].get("viewer_count", 0)
                        title = data[0].get("title", title)
        except Exception as e:
            print(f"Failed to reach Twitch API: {e}")
            # Fallback to mock on error
            is_live = True
            viewer_count = random.randint(10, 5000)
    else:
        # Mock fallback when keys are missing
        is_live = True
        viewer_count = random.randint(10, 5000)

    
    stream = db.query(models.Stream).filter(
        models.Stream.user_id == current_user.id,
        models.Stream.match_id == stream_data.match_id
    ).first()
    
    if stream:
        stream.is_live = is_live
        stream.viewer_count = viewer_count
        stream.title = title
    else:
        stream = models.Stream(
            user_id=current_user.id,
            match_id=stream_data.match_id,
            platform="Twitch",
            stream_url=stream_data.stream_url,
            title=title,
            viewer_count=viewer_count,
            is_live=is_live
        )
        db.add(stream)
        
    db.commit()
    db.refresh(stream)
    return stream

@router.post("/sync-youtube", response_model=schemas.Stream)
def sync_youtube_stream(
    stream_data: schemas.StreamCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    MOCK: Syncs with YouTube API to verify stream status.
    """
    if stream_data.platform.lower() != "youtube":
        raise HTTPException(status_code=400, detail="Use /sync-twitch for Twitch streams")
        
    stream = models.Stream(
        user_id=current_user.id,
        match_id=stream_data.match_id,
        platform="YouTube",
        stream_url=stream_data.stream_url,
        title=stream_data.title or f"{current_user.name} Live Tournament Run",
        viewer_count=random.randint(50, 10000),
        is_live=True
    )
    db.add(stream)
    db.commit()
    db.refresh(stream)
    return stream

@router.get("/live", response_model=List[schemas.Stream])
def get_live_streams(db: Session = Depends(database.get_db)):
    """
    Fetches all active streams to display on the platform's multi-stream carousel.
    """
    return db.query(models.Stream).filter(models.Stream.is_live == True).order_by(models.Stream.viewer_count.desc()).all()

@router.post("/commentary", response_model=schemas.Commentary)
def push_live_commentary(
    data: schemas.CommentaryCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_admin_user)
):
    """
    Admin/Caster endpoint to push live text or audio commentary updates.
    """
    comment = models.Commentary(
        match_id=data.match_id,
        commentator_id=current_user.id,
        content=data.content,
        audio_url=data.audio_url # If audio integration is provided
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment

@router.get("/commentary/{match_id}", response_model=List[schemas.Commentary])
def get_match_commentary(match_id: int, db: Session = Depends(database.get_db)):
    """
    Fetches the live commentary timeline for a specific match.
    """
    return db.query(models.Commentary).filter(models.Commentary.match_id == match_id).order_by(models.Commentary.timestamp.asc()).all()

@router.post("/highlights", response_model=schemas.HighlightTimeline)
def add_highlight_event(
    data: schemas.HighlightTimelineCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_admin_user)
):
    """
    Logs a critical event for stream overlays (e.g. 'First Blood').
    """
    highlight = models.HighlightTimeline(
        match_id=data.match_id,
        event_type=data.event_type,
        game_timestamp=data.game_timestamp,
        description=data.description
    )
    db.add(highlight)
    db.commit()
    db.refresh(highlight)
    return highlight

@router.post("/clips/generate", response_model=schemas.MatchClip)
def generate_match_clip(
    data: schemas.MatchClipCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    MOCK: Instructs the backend to clip the VOD based on a timestamp.
    Returns the URL of the generated clip.
    """
    # Simulate clip generation time and logic
    mock_clip_url = f"https://cdn.ultraesports.com/clips/match_{data.match_id}_{random.randint(1000,9999)}.mp4"
    
    clip = models.MatchClip(
        match_id=data.match_id,
        stream_id=data.stream_id,
        clip_url=mock_clip_url,
        description=data.description or f"Epic highlight by {current_user.name}"
    )
    db.add(clip)
    db.commit()
    db.refresh(clip)
    return clip

@router.get("/clips", response_model=List[schemas.MatchClip])
def get_match_clips(db: Session = Depends(database.get_db)):
    """
    Fetches all AI-generated match clips for the TikTok-style feed.
    """
    return db.query(models.MatchClip).order_by(models.MatchClip.created_at.desc()).limit(20).all()
