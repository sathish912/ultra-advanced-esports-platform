from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: Optional[str] = "player"
    avatar: Optional[str] = None

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    ranking_points: int
    wins: int
    losses: int
    kills: int
    mvps: int
    achievements: Optional[str] = None
    is_flagged: bool = False
    
    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class TokenData(BaseModel):
    email: Optional[str] = None

class TournamentBase(BaseModel):
    name: str
    game: str
    prize_pool: float = 0.0
    max_players: int = 100
    entry_fee: float = 0.0
    currency: str = "USD"
    status: str = "Upcoming"
    reg_start: Optional[datetime] = None
    reg_end: Optional[datetime] = None
    match_day: Optional[datetime] = None
    banner: Optional[str] = None
    rules: Optional[str] = None
    match_type: Optional[str] = "Solo"
    stream_url: Optional[str] = None

class TournamentCreate(TournamentBase):
    pass

class TournamentUpdate(TournamentBase):
    name: Optional[str] = None
    game: Optional[str] = None

class Tournament(TournamentBase):
    id: int

    class Config:
        from_attributes = True

class RegistrationBase(BaseModel):
    tournament_id: int

class RegistrationCreate(RegistrationBase):
    pass

class Registration(RegistrationBase):
    id: int
    user_id: int
    registration_status: str
    user: Optional[User] = None
    checkout_url: Optional[str] = None
    
    class Config:
        from_attributes = True

class MatchBase(BaseModel):
    tournament_id: int
    match_status: str = "Scheduled"
    scores: Optional[str] = None
    player1_id: Optional[int] = None
    player2_id: Optional[int] = None
    round: Optional[int] = 1
    player1_score: Optional[int] = 0
    player2_score: Optional[int] = 0
    player1_kills: Optional[int] = 0
    player2_kills: Optional[int] = 0
    replay_url: Optional[str] = None

class MatchCreate(MatchBase):
    pass

class MatchUpdate(BaseModel):
    match_status: Optional[str] = None
    winner_id: Optional[int] = None
    scores: Optional[str] = None
    replay_url: Optional[str] = None
    player1_score: Optional[int] = None
    player2_score: Optional[int] = None
    player1_kills: Optional[int] = None
    player2_kills: Optional[int] = None

class Match(MatchBase):
    id: int
    winner_id: Optional[int] = None
    player1: Optional[User] = None
    player2: Optional[User] = None
    replay_url: Optional[str] = None
    disputed: bool = False
    dispute_reason: Optional[str] = None

    tournament: Tournament
    winner: Optional[User] = None

    class Config:
        from_attributes = True

class MatchDispute(BaseModel):
    reason: str

class NotificationBase(BaseModel):
    title: str
    message: str
    is_read: bool = False

class NotificationCreate(NotificationBase):
    user_id: int

class Notification(NotificationBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True
