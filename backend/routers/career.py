from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import models, schemas, database
from auth import get_current_user

router = APIRouter(
    prefix="/career",
    tags=["Career"],
    responses={404: {"description": "Not found"}},
)

# Portfolio Endpoints
@router.get("/portfolio/{user_id}", response_model=schemas.PlayerPortfolio)
def get_portfolio(user_id: int, db: Session = Depends(database.get_db)):
    portfolio = db.query(models.PlayerPortfolio).filter(models.PlayerPortfolio.user_id == user_id).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    return portfolio

@router.post("/portfolio", response_model=schemas.PlayerPortfolio)
def create_portfolio(portfolio: schemas.PlayerPortfolioCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    existing = db.query(models.PlayerPortfolio).filter(models.PlayerPortfolio.user_id == current_user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Portfolio already exists")
    db_portfolio = models.PlayerPortfolio(**portfolio.model_dump(), user_id=current_user.id)
    db.add(db_portfolio)
    db.commit()
    db.refresh(db_portfolio)
    return db_portfolio

@router.put("/portfolio", response_model=schemas.PlayerPortfolio)
def update_portfolio(portfolio: schemas.PlayerPortfolioUpdate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    db_portfolio = db.query(models.PlayerPortfolio).filter(models.PlayerPortfolio.user_id == current_user.id).first()
    if not db_portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    for key, value in portfolio.model_dump(exclude_unset=True).items():
        setattr(db_portfolio, key, value)
    
    db.commit()
    db.refresh(db_portfolio)
    return db_portfolio

# Scout Endpoint
@router.get("/admin/portfolios")
def get_all_portfolios_admin(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    portfolios = db.query(models.PlayerPortfolio).all()
    result = []
    for p in portfolios:
        user = db.query(models.User).filter(models.User.id == p.user_id).first()
        if user and user.role != "admin":
            p_data = schemas.PlayerPortfolio.model_validate(p).model_dump()
            p_data["user_name"] = user.name
            p_data["user_avatar"] = user.avatar
            p_data["user_mmr"] = user.mmr
            p_data["is_verified_pro"] = user.is_verified_pro
            result.append(p_data)
    return result
@router.get("/admin/contracts")
def get_all_contracts_admin(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    contracts = db.query(models.PlayerContract).all()
    result = []
    for c in contracts:
        c_data = {
            "id": c.id,
            "player_name": c.player.name if c.player else "Unknown",
            "team_name": c.team.name if c.team else "Unknown",
            "salary": c.salary,
            "duration_months": c.duration_months,
            "buyout_clause": c.buyout_clause,
            "status": c.status,
            "signed_at": c.signed_at
        }
        result.append(c_data)
    return result

@router.get("/scout", response_model=List[schemas.User])
def scout_players(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    # Only return users who have looking_for_team = True in their portfolio
    portfolios = db.query(models.PlayerPortfolio).filter(models.PlayerPortfolio.looking_for_team == True).all()
    user_ids = [p.user_id for p in portfolios]
    users = db.query(models.User).filter(models.User.id.in_(user_ids)).order_by(models.User.mmr.desc()).all()
    return users

# Applications
@router.post("/apply", response_model=schemas.ProTeamApplication)
def apply_to_team(application: schemas.ProTeamApplicationCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    db_app = models.ProTeamApplication(**application.model_dump(), player_id=current_user.id)
    db.add(db_app)
    db.commit()
    db.refresh(db_app)
    return db_app

@router.get("/applications", response_model=List[schemas.ProTeamApplication])
def get_my_applications(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.ProTeamApplication).filter(models.ProTeamApplication.player_id == current_user.id).all()

@router.get("/my-squads")
def get_my_squads(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    squads = []
    
    # Check Clan
    clan_member = db.query(models.ClanMember).filter(models.ClanMember.user_id == current_user.id).first()
    if clan_member:
        clan = db.query(models.Clan).filter(models.Clan.id == clan_member.clan_id).first()
        if clan:
            squads.append({
                "type": "Clan",
                "name": clan.name,
                "role": clan_member.role,
                "joined_at": clan_member.joined_at.isoformat()
            })
            
    # Check Team
    team_member = db.query(models.TeamMember).filter(models.TeamMember.user_id == current_user.id).first()
    if team_member:
        team = db.query(models.Team).filter(models.Team.id == team_member.team_id).first()
        if team:
            squads.append({
                "type": "Pro Team",
                "name": team.name,
                "role": team_member.role if hasattr(team_member, 'role') else 'Member',
                "joined_at": getattr(team_member, 'joined_at', None)
            })
            
    return squads

# Contracts
@router.post("/contract/offer", response_model=schemas.PlayerContract)
def offer_contract(contract: schemas.PlayerContractCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    # Verify current user is captain of the team they are offering for
    # Assuming team_id is passed implicitly if we just take the user's first team for now, or require team_id in schema
    # Let's require the user to be a captain of some team
    team = db.query(models.Team).filter(models.Team.captain_id == current_user.id).first()
    if not team:
        raise HTTPException(status_code=403, detail="Only team captains can offer contracts")
    
    db_contract = models.PlayerContract(**contract.model_dump(), team_id=team.id)
    db.add(db_contract)
    db.commit()
    db.refresh(db_contract)
    return db_contract

@router.get("/contracts/my-offers", response_model=List[schemas.PlayerContract])
def get_my_contract_offers(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.PlayerContract).filter(models.PlayerContract.player_id == current_user.id).all()

@router.post("/contract/{contract_id}/accept", response_model=schemas.PlayerContract)
def accept_contract(contract_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    contract = db.query(models.PlayerContract).filter(models.PlayerContract.id == contract_id, models.PlayerContract.player_id == current_user.id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    if contract.status != "Offered":
        raise HTTPException(status_code=400, detail="Contract is no longer valid")
        
    import datetime
    contract.status = "Signed"
    contract.signed_at = datetime.datetime.utcnow()
    
    # Also add user to the team officially if not already
    member = db.query(models.TeamMember).filter(models.TeamMember.team_id == contract.team_id, models.TeamMember.user_id == current_user.id).first()
    if not member:
        new_member = models.TeamMember(team_id=contract.team_id, user_id=current_user.id, role="Pro Player")
        db.add(new_member)
        
    db.commit()
    db.refresh(contract)
    return contract
