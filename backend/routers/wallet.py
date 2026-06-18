from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import razorpay
import os

import models, schemas, database, auth

# We rely on the env variables loaded in main.py or load them here
razorpay_client = razorpay.Client(auth=(os.getenv("RAZORPAY_KEY_ID"), os.getenv("RAZORPAY_KEY_SECRET")))

router = APIRouter(prefix="/wallet", tags=["Monetization Workflows"])

processed_sessions = set()

@router.get("/transactions", response_model=list[schemas.Transaction])
def get_transactions(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """View financial ledger history"""
    return db.query(models.Transaction).filter(
        models.Transaction.user_id == current_user.id
    ).order_by(models.Transaction.created_at.desc()).all()

@router.post("/deposit")
def deposit_wallet(
    data: dict,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    amount = float(data.get("amount", 0))
    if amount < 500:
        raise HTTPException(status_code=400, detail="Minimum deposit is ₹500")
        
    try:
        order_amount = int(amount * 100) # INR paise
        order_currency = 'INR'
        order_receipt = f'deposit_{current_user.id}_{int(amount)}'
        notes = {
            'type': 'wallet_deposit',
            'user_id': str(current_user.id)
        }
        
        razorpay_order = razorpay_client.order.create(dict(amount=order_amount, currency=order_currency, receipt=order_receipt, notes=notes))
        return {
            "order_id": razorpay_order['id'],
            "amount": order_amount,
            "currency": order_currency,
            "key_id": os.getenv("RAZORPAY_KEY_ID")
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Razorpay error: {str(e)}")

@router.post("/verify-deposit")
def verify_wallet_deposit(data: dict, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    try:
        razorpay_payment_id = data.get('razorpay_payment_id')
        razorpay_order_id = data.get('razorpay_order_id')
        razorpay_signature = data.get('razorpay_signature')
        
        if razorpay_payment_id in processed_sessions:
            return {"detail": "Deposit already verified"}
            
        razorpay_client.utility.verify_payment_signature({
            'razorpay_order_id': razorpay_order_id,
            'razorpay_payment_id': razorpay_payment_id,
            'razorpay_signature': razorpay_signature
        })
        
        order = razorpay_client.order.fetch(razorpay_order_id)
        notes = order.get('notes', {})
        if notes.get('type') == 'wallet_deposit':
            user_id = int(notes.get('user_id', 0))
            amount = order.get('amount', 0) / 100.0
            
            user = db.query(models.User).filter(models.User.id == user_id).first()
            if user:
                # Add balance to user
                user.wallet_balance += amount
                
                # Log transaction
                tx = models.Transaction(
                    user_id=user.id,
                    amount=amount,
                    currency="INR",
                    transaction_type="Deposit",
                    status="Completed",
                    reference_id=razorpay_payment_id
                )
                db.add(tx)
                
                # Add balance to admin (platform wallet)
                admin_user = db.query(models.User).filter(models.User.role == "admin").first()
                if admin_user:
                    admin_user.wallet_balance += amount
                    
                db.commit()
            processed_sessions.add(razorpay_payment_id)
            return {"detail": "Deposit verified successfully"}
        else:
            raise HTTPException(status_code=400, detail="Invalid order type")
    except razorpay.errors.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Signature verification failed")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/withdraw")
def withdraw_wallet(
    data: dict,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    amount = float(data.get("amount", 0))
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid amount")
    if current_user.wallet_balance < amount:
        raise HTTPException(status_code=400, detail="Insufficient funds")
        
    if not current_user.payout_upi_id:
        raise HTTPException(status_code=400, detail="Please configure a Payout UPI ID in your profile before withdrawing.")
        
    try:
        # Mocking Razorpay Payout (Requires RazorpayX in real world)
        transfer_id = f"payout_simulated_{amount}"
        
        current_user.wallet_balance -= amount
        
        # Log Transaction
        tx = models.Transaction(
            user_id=current_user.id,
            amount=-amount,
            currency="INR",
            transaction_type="Withdrawal",
            status="Completed",
            reference_id=transfer_id
        )
        db.add(tx)
        
        # Deduct from admin wallet since platform paid it out
        admin_user = db.query(models.User).filter(models.User.role == "admin").first()
        if admin_user:
            admin_user.wallet_balance -= amount
            
        db.commit()
        return {"detail": "Withdrawal requested via UPI"}
    except Exception as e:
        # Log failed transaction
        tx = models.Transaction(
            user_id=current_user.id,
            amount=-amount,
            currency="INR",
            transaction_type="Withdrawal",
            status="Failed",
            reference_id=None
        )
        db.add(tx)
        db.commit()
        raise HTTPException(status_code=400, detail=f"Razorpay Payout failed: {str(e)}")
