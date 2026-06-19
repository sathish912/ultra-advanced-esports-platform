from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import models
import schemas
import database
import auth

router = APIRouter(
    prefix="/marketplace",
    tags=["Marketplace"]
)

# Store Endpoints
@router.get("/store/items", response_model=List[schemas.StoreItem])
def get_store_items(db: Session = Depends(database.get_db)):
    return db.query(models.StoreItem).filter(models.StoreItem.is_active == True).all()

@router.post("/store/buy/{item_id}", response_model=schemas.Purchase)
def buy_item(item_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    item = db.query(models.StoreItem).filter(models.StoreItem.id == item_id).first()
    if not item or not item.is_active:
        raise HTTPException(status_code=404, detail="Item not found or inactive")
    
    if item.stock == 0:
        raise HTTPException(status_code=400, detail="Item is out of stock")
        
    if current_user.wallet_balance < item.price:
        raise HTTPException(status_code=400, detail="Insufficient wallet balance")
        
    # Deduct funds
    current_user.wallet_balance -= item.price
    
    # Manage stock
    if item.stock > 0:
        item.stock -= 1
        
    # Create Purchase
    purchase = models.Purchase(
        user_id=current_user.id,
        item_id=item.id,
        price_paid=item.price
    )
    db.add(purchase)
    db.commit()
    db.refresh(purchase)
    
    return purchase

# Battle Pass Endpoints
@router.get("/battlepass/current")
def get_current_battlepass(db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    season = db.query(models.BattlePassSeason).filter(models.BattlePassSeason.is_active == True).first()
    if not season:
        return {"season": None, "tiers": [], "progress": None}
        
    tiers = db.query(models.BattlePassTier).filter(models.BattlePassTier.bp_season_id == season.id).order_by(models.BattlePassTier.tier_level).all()
    
    progress = db.query(models.BattlePassProgress).filter(
        models.BattlePassProgress.bp_season_id == season.id,
        models.BattlePassProgress.user_id == current_user.id
    ).first()
    
    if not progress:
        # Create initial progress
        progress = models.BattlePassProgress(
            user_id=current_user.id,
            bp_season_id=season.id,
            current_xp=0,
            is_premium_unlocked=False
        )
        db.add(progress)
        db.commit()
        db.refresh(progress)
        
    return {
        "season": season,
        "tiers": tiers,
        "progress": progress
    }

@router.post("/battlepass/upgrade")
def upgrade_battlepass(db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    # Assuming premium pass costs 499 INR/points
    UPGRADE_COST = 499.0
    
    season = db.query(models.BattlePassSeason).filter(models.BattlePassSeason.is_active == True).first()
    if not season:
        raise HTTPException(status_code=404, detail="No active battle pass season")
        
    progress = db.query(models.BattlePassProgress).filter(
        models.BattlePassProgress.bp_season_id == season.id,
        models.BattlePassProgress.user_id == current_user.id
    ).first()
    
    if not progress:
        raise HTTPException(status_code=400, detail="Progress not found")
        
    if progress.is_premium_unlocked:
        raise HTTPException(status_code=400, detail="Already upgraded to Premium Pass")
        
    if current_user.wallet_balance < UPGRADE_COST:
        raise HTTPException(status_code=400, detail="Insufficient wallet balance to upgrade")
        
    # Deduct funds and upgrade
    current_user.wallet_balance -= UPGRADE_COST
    progress.is_premium_unlocked = True
    
    db.commit()
    db.refresh(progress)
    return {"detail": "Successfully upgraded to Premium Battle Pass", "progress": progress}

@router.get("/battlepass/purchasers")
def get_battlepass_purchasers(db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    season = db.query(models.BattlePassSeason).filter(models.BattlePassSeason.is_active == True).first()
    if not season:
        return []
        
    purchasers = db.query(models.User, models.BattlePassProgress).join(
        models.BattlePassProgress, models.User.id == models.BattlePassProgress.user_id
    ).filter(
        models.BattlePassProgress.bp_season_id == season.id,
        models.BattlePassProgress.is_premium_unlocked == True
    ).all()
    
    result = []
    for user, progress in purchasers:
        result.append({
            "user_id": user.id,
            "name": user.name,
            "email": user.email,
            "current_xp": progress.current_xp,
            "level": (progress.current_xp // 100) + 1,
            "unlocked_at": progress.updated_at
        })
    return result
