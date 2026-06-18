from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, date

class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: Optional[str] = "player"
    avatar: Optional[str] = None
    payout_upi_id: Optional[str] = None
    date_of_birth: Optional[date] = None
    mobile_no: Optional[str] = None
    language: Optional[str] = "English"

class UserUpdate(BaseModel):
    name: Optional[str] = None
    avatar: Optional[str] = None
    country: Optional[str] = None
    date_of_birth: Optional[date] = None
    mobile_no: Optional[str] = None
    language: Optional[str] = None

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    ranking_points: int
    is_premium: bool = False
    wallet_balance: float = 500.0
    country: str = "India"
    wins: int
    losses: int
    kills: int
    best_kill: int = 0
    mvps: int
    rank: Optional[int] = None
    achievements: Optional[str] = None
    is_flagged: bool = False
    
    # Advanced Ranking Ecosystem
    mmr: float = 1000.0
    tier: str = "Bronze"
    rank_decay_date: Optional[datetime] = None
    ai_trust_score: float = 100.0
    
    class Config:
        from_attributes = True

class SeasonBase(BaseModel):
    name: str
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_active: bool = True

class Season(SeasonBase):
    id: int

    class Config:
        from_attributes = True

class EloHistoryBase(BaseModel):
    user_id: int
    season_id: int
    mmr: float
    tier: str
    match_id: Optional[int] = None

class EloHistory(EloHistoryBase):
    id: int
    timestamp: datetime

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
    approved_count: int = 0

class TournamentCreate(TournamentBase):
    pass

class TournamentUpdate(TournamentBase):
    name: Optional[str] = None
    game: Optional[str] = None

class Tournament(TournamentBase):
    id: int

    class Config:
        from_attributes = True

class InstantMatchCreate(BaseModel):
    game: str
    match_type: str = "1v1"
    player1_id: Optional[int] = None
    player2_id: Optional[int] = None
    team1_id: Optional[int] = None
    team2_id: Optional[int] = None
    prize_pool: float = 0.0
    banner: Optional[str] = None
    stream_url: Optional[str] = None

class RegistrationBase(BaseModel):
    tournament_id: Optional[int] = None
    team_id: Optional[int] = None

class RegistrationCreate(RegistrationBase):
    pass

class Registration(RegistrationBase):
    id: int
    user_id: int
    registration_status: str
    user: Optional[User] = None
    checkout_url: Optional[str] = None
    tournament: Optional[Tournament] = None
    
    class Config:
        from_attributes = True

class MatchBase(BaseModel):
    tournament_id: int
    match_status: str = "Scheduled"
    scores: Optional[str] = None
    player1_id: Optional[int] = None
    player2_id: Optional[int] = None
    player3_id: Optional[int] = None
    team1_id: Optional[int] = None
    team2_id: Optional[int] = None
    round: Optional[int] = 1
    player1_score: Optional[int] = 0
    player2_score: Optional[int] = 0
    player3_score: Optional[int] = 0
    team1_score: Optional[int] = 0
    team2_score: Optional[int] = 0
    player1_kills: Optional[int] = 0
    player2_kills: Optional[int] = 0
    player3_kills: Optional[int] = 0
    replay_url: Optional[str] = None

class MatchCreate(MatchBase):
    pass

class MatchUpdate(BaseModel):
    match_status: Optional[str] = None
    scores: Optional[str] = None
    winner_id: Optional[int] = None
    player1_score: Optional[int] = None
    player2_score: Optional[int] = None
    player3_score: Optional[int] = None
    team1_score: Optional[int] = None
    team2_score: Optional[int] = None
    player1_kills: Optional[int] = None
    player2_kills: Optional[int] = None
    player3_kills: Optional[int] = None
    winner_team_id: Optional[int] = None

class Match(MatchBase):
    id: int
    winner_id: Optional[int] = None
    winner_team_id: Optional[int] = None
    player1: Optional[User] = None
    player2: Optional[User] = None
    player3: Optional[User] = None
    team1: Optional["Team"] = None
    team2: Optional["Team"] = None
    disputed: Optional[bool] = False
    dispute_reason: Optional[str] = None
    tournament: Optional[Tournament] = None
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

class SuperchatCheckout(BaseModel):
    amount: float
    message: str

class PayoutRequest(BaseModel):
    email: EmailStr
    amount: float
    upi_id: Optional[str] = None

# Battle Royale Schemas
class RoomCredentialsUpdate(BaseModel):
    room_id: str
    room_password: str

class MatchParticipantResult(BaseModel):
    user_id: Optional[int] = None
    team_id: Optional[int] = None
    placement: int
    kills: int

class BRMatchResultSubmit(BaseModel):
    participants: List[MatchParticipantResult]

# Team / Squad Schemas
class TeamBase(BaseModel):
    name: str
    tournament_id: Optional[int] = None
    is_recruiting: bool = True
    max_members: int = 4

class TeamCreate(TeamBase):
    pass

class TeamMemberBase(BaseModel):
    team_id: int
    user_id: int

class TeamMember(TeamMemberBase):
    id: int
    user: User
    
    class Config:
        from_attributes = True

class Team(TeamBase):
    id: int
    captain_id: int
    members: List[TeamMember] = []
    
    class Config:
        from_attributes = True

class TeamJoinRequestBase(BaseModel):
    team_id: int

class TeamJoinRequestCreate(TeamJoinRequestBase):
    pass

class TeamJoinRequest(TeamJoinRequestBase):
    id: int
    user_id: int
    status: str
    created_at: datetime
    user: User
    team: Optional[Team] = None
    
    class Config:
        from_attributes = True

class TeamInviteBase(BaseModel):
    team_id: int
    invitee_id: int

class TeamInviteCreate(TeamInviteBase):
    pass

class TeamInvite(TeamInviteBase):
    id: int
    inviter_id: int
    status: str
    created_at: datetime
    inviter: User
    invitee: User
    team: Team
    
    class Config:
        from_attributes = True

# Clan Schemas

class ClanBanRequest(BaseModel):
    reason: str

class ClanMemberBase(BaseModel):
    clan_id: int
    user_id: int
    role: str

class ClanMember(ClanMemberBase):
    id: int
    joined_at: datetime
    
    class Config:
        from_attributes = True

class ClanMemberWithUser(ClanMember):
    user: 'User'

    class Config:
        from_attributes = True

class ClanBase(BaseModel):
    name: str
    tag: str
    description: Optional[str] = None
    logo_url: Optional[str] = None
    is_recruiting: bool = True

class ClanCreate(ClanBase):
    pass

class Clan(ClanBase):
    id: int
    leader_id: int
    xp: int
    level: int
    created_at: datetime
    is_banned: bool = False
    ban_reason: Optional[str] = None
    members: List[ClanMember] = []
    
    class Config:
        from_attributes = True

class ClanJoinRequestBase(BaseModel):
    clan_id: int

class ClanJoinRequestCreate(ClanJoinRequestBase):
    pass

class ClanJoinRequest(ClanJoinRequestBase):
    id: int
    user_id: int
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class ClanJoinRequestWithUser(ClanJoinRequest):
    user: 'User'

    class Config:
        from_attributes = True

# AI Engine Schemas
class AntiCheatFlagBase(BaseModel):
    match_id: Optional[int] = None
    reason: str
    severity: str = "High"

class AntiCheatFlag(AntiCheatFlagBase):
    id: int
    user_id: int
    resolved: bool
    created_at: datetime

    class Config:
        from_attributes = True

class AIPredictionBase(BaseModel):
    match_id: int
    predicted_winner_id: Optional[int] = None
    confidence_score: float
    features_used: str

class AIPrediction(AIPredictionBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Monetization Schemas
class TransactionBase(BaseModel):
    amount: float
    currency: str = "USD"
    transaction_type: str
    status: str = "Pending"
    reference_id: Optional[str] = None

class TransactionCreate(TransactionBase):
    pass

class Transaction(TransactionBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Streaming Schemas
class StreamBase(BaseModel):
    match_id: Optional[int] = None
    platform: str
    stream_url: str
    title: Optional[str] = None

class StreamCreate(StreamBase):
    pass

class Stream(StreamBase):
    id: int
    user_id: int
    viewer_count: int
    is_live: bool
    started_at: datetime

    class Config:
        from_attributes = True

class CommentaryBase(BaseModel):
    match_id: int
    content: str
    audio_url: Optional[str] = None

class CommentaryCreate(CommentaryBase):
    pass

class Commentary(CommentaryBase):
    id: int
    commentator_id: int
    timestamp: datetime

    class Config:
        from_attributes = True

class MatchClipBase(BaseModel):
    match_id: int
    stream_id: Optional[int] = None
    clip_url: str
    description: Optional[str] = None

class MatchClipCreate(MatchClipBase):
    pass

class MatchClip(MatchClipBase):
    id: int
    likes_count: int
    created_at: datetime

    class Config:
        from_attributes = True

class HighlightTimelineBase(BaseModel):
    match_id: int
    event_type: str
    game_timestamp: str
    description: str

class HighlightTimelineCreate(HighlightTimelineBase):
    pass

class HighlightTimeline(HighlightTimelineBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Store and Merchandise
class StoreItemBase(BaseModel):
    name: str
    description: str
    price: float
    image_url: Optional[str] = None
    item_type: str
    stock: int = -1
    is_active: bool = True

class StoreItem(StoreItemBase):
    id: int

    class Config:
        from_attributes = True

class PurchaseBase(BaseModel):
    item_id: int
    price_paid: float

class Purchase(PurchaseBase):
    id: int
    user_id: int
    purchase_date: datetime
    status: str

    class Config:
        from_attributes = True

# Battle Pass
class BattlePassTierBase(BaseModel):
    bp_season_id: int
    tier_level: int
    required_xp: int
    reward_name: str
    reward_type: str
    is_premium: bool = False

class BattlePassTier(BattlePassTierBase):
    id: int

    class Config:
        from_attributes = True

class BattlePassProgressBase(BaseModel):
    bp_season_id: int
    current_xp: int = 0
    is_premium_unlocked: bool = False

class BattlePassProgress(BattlePassProgressBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True

# Social
class FriendshipBase(BaseModel):
    friend_id: int

class FriendshipCreate(FriendshipBase):
    pass

class Friendship(BaseModel):
    id: int
    user_id: int
    friend_id: int
    status: str
    created_at: datetime
    user: User
    friend: User

    class Config:
        from_attributes = True

class DirectMessageBase(BaseModel):
    receiver_id: int
    message: str

class DirectMessageCreate(DirectMessageBase):
    pass

class DirectMessage(BaseModel):
    id: int
    sender_id: int
    receiver_id: int
    message: str
    is_read: bool
    created_at: datetime
    sender: User

    class Config:
        from_attributes = True

# Audience / Spectator Experience
class MVPVoteCreate(BaseModel):
    player_id: int

class MVPVote(BaseModel):
    id: int
    match_id: int
    spectator_id: int
    player_id: int
    created_at: datetime
    player: User
    
    class Config:
        from_attributes = True

class MVPResult(BaseModel):
    player_id: int
    player_name: str
    avatar: Optional[str] = None
    votes: int

class FantasyTeamRosterAdd(BaseModel):
    player_id: int

class FantasyTeamRoster(BaseModel):
    id: int
    fantasy_team_id: int
    player_id: int
    player: User

    class Config:
        from_attributes = True

class FantasyTeamCreate(BaseModel):
    name: str

class FantasyTeam(BaseModel):
    id: int
    user_id: int
    name: str
    score: float
    budget_remaining: int
    created_at: datetime
    roster: List[FantasyTeamRoster] = []

    class Config:
        from_attributes = True

# eSports Career System Schemas

class PlayerPortfolioBase(BaseModel):
    bio: Optional[str] = None
    preferred_roles: Optional[str] = None
    past_teams: Optional[str] = None
    hardware_specs: Optional[str] = None
    looking_for_team: Optional[bool] = True

class PlayerPortfolioCreate(PlayerPortfolioBase):
    pass

class PlayerPortfolioUpdate(PlayerPortfolioBase):
    pass

class PlayerPortfolio(PlayerPortfolioBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class ProTeamApplicationBase(BaseModel):
    team_id: int
    cover_letter: Optional[str] = None

class ProTeamApplicationCreate(ProTeamApplicationBase):
    pass

class ProTeamApplication(ProTeamApplicationBase):
    id: int
    player_id: int
    status: str
    created_at: datetime
    player: User
    team: Optional[Team] = None

    class Config:
        from_attributes = True

class PlayerContractBase(BaseModel):
    salary: Optional[float] = 0.0
    duration_months: Optional[int] = 12
    buyout_clause: Optional[float] = 0.0
    streaming_rights: Optional[str] = None

class PlayerContractCreate(PlayerContractBase):
    player_id: int

class PlayerContract(PlayerContractBase):
    id: int
    player_id: int
    team_id: int
    status: str
    signed_at: Optional[datetime] = None
    created_at: datetime
    player: User
    team: Optional[Team] = None

    class Config:
        from_attributes = True

# Support Ticket Schemas
class SupportTicketBase(BaseModel):
    subject: str
    description: str
    category: str

class SupportTicketCreate(SupportTicketBase):
    pass

class SupportTicketUpdate(BaseModel):
    status: str
    bounty_awarded: float = 0.0

class SupportTicket(SupportTicketBase):
    id: int
    user_id: int
    status: str
    bounty_awarded: float
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
