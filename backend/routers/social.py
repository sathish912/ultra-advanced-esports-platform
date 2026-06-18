from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import List

import models, schemas, database, auth

router = APIRouter(prefix="/social", tags=["Social"])

@router.post("/friends/request")
def send_friend_request(
    friend_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if friend_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot add yourself as a friend")

    friend = db.query(models.User).filter(models.User.id == friend_id).first()
    if not friend:
        raise HTTPException(status_code=404, detail="User not found")

    existing = db.query(models.Friendship).filter(
        or_(
            and_(models.Friendship.user_id == current_user.id, models.Friendship.friend_id == friend_id),
            and_(models.Friendship.user_id == friend_id, models.Friendship.friend_id == current_user.id)
        )
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Friendship or request already exists")

    new_request = models.Friendship(user_id=current_user.id, friend_id=friend_id, status="Pending")
    db.add(new_request)
    db.commit()
    return {"detail": "Friend request sent"}

@router.post("/friends/requests/{request_id}/accept")
def accept_friend_request(
    request_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    req = db.query(models.Friendship).filter(models.Friendship.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
        
    if req.friend_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to accept this request")

    req.status = "Accepted"
    db.commit()
    return {"detail": "Friend request accepted"}

@router.post("/friends/requests/{request_id}/reject")
def reject_friend_request(
    request_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    req = db.query(models.Friendship).filter(models.Friendship.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
        
    if req.friend_id != current_user.id and req.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    db.delete(req)
    db.commit()
    return {"detail": "Friend request removed"}

@router.get("/friends", response_model=List[schemas.User])
def get_friends(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    friendships = db.query(models.Friendship).filter(
        and_(
            or_(models.Friendship.user_id == current_user.id, models.Friendship.friend_id == current_user.id),
            models.Friendship.status == "Accepted"
        )
    ).all()

    friends = []
    for f in friendships:
        if f.user_id == current_user.id:
            friends.append(f.friend)
        else:
            friends.append(f.user)
            
    return friends

@router.get("/friends/requests", response_model=List[schemas.Friendship])
def get_friend_requests(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Get pending incoming requests"""
    return db.query(models.Friendship).filter(
        models.Friendship.friend_id == current_user.id,
        models.Friendship.status == "Pending"
    ).all()

@router.get("/admin/friendships", response_model=List[schemas.Friendship])
def get_all_friendships_admin(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Admin only: get all established friendships on the platform"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")
    
    return db.query(models.Friendship).filter(models.Friendship.status == "Accepted").all()

@router.get("/messages/{friend_id}", response_model=List[schemas.DirectMessage])
def get_messages(
    friend_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    messages = db.query(models.DirectMessage).filter(
        or_(
            and_(models.DirectMessage.sender_id == current_user.id, models.DirectMessage.receiver_id == friend_id),
            and_(models.DirectMessage.sender_id == friend_id, models.DirectMessage.receiver_id == current_user.id)
        )
    ).order_by(models.DirectMessage.created_at.asc()).all()
    
    # Mark messages as read
    unread = [m for m in messages if m.receiver_id == current_user.id and not m.is_read]
    if unread:
        for m in unread:
            m.is_read = True
        db.commit()

    return messages
