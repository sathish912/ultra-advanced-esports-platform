from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Float, DateTime, Date
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), index=True)
    email = Column(String(255), unique=True, index=True)
    password = Column(String(255))
    role = Column(String(255), default="player") # "admin" or "player"
    avatar = Column(String(255), nullable=True)
    ranking_points = Column(Integer, default=0)
    is_premium = Column(Boolean, default=False)
    wallet_balance = Column(Float, default=500.0)
    country = Column(String(255), default="India")
    date_of_birth = Column(Date, nullable=True)
    mobile_no = Column(String(50), nullable=True)
    language = Column(String(100), default="English")
    
    # Career Stats
    wins = Column(Integer, default=0)
    losses = Column(Integer, default=0)
    kills = Column(Integer, default=0)
    best_kill = Column(Integer, default=0)
    mvps = Column(Integer, default=0)
    achievements = Column(String(1000), nullable=True)
    is_flagged = Column(Boolean, default=False)
    payout_upi_id = Column(String(255), nullable=True)

    # Advanced Ranking Ecosystem
    mmr = Column(Float, default=1000.0) # Matchmaking Rating / Elo
    tier = Column(String(50), default="Bronze") # Bronze, Silver, Gold, Platinum, Diamond, Immortal
    rank_decay_date = Column(DateTime, nullable=True)
    
    # AI Engine Features
    ai_trust_score = Column(Float, default=100.0) # 0 to 100 scale. Drops when flagged by Anti-Cheat.
    # Advanced Security
    mfa_secret = Column(String(255), nullable=True)
    mfa_enabled = Column(Boolean, default=False)
    
    # Monetization
    total_earnings = Column(Float, default=0.0)
    
    # Streaming Integrations
    twitch_username = Column(String(255), nullable=True)
    youtube_channel = Column(String(255), nullable=True)

    # eSports Career
    is_verified_pro = Column(Boolean, default=False)
    pro_badge_url = Column(String(255), nullable=True)

    registrations = relationship("Registration", back_populates="user", foreign_keys="[Registration.user_id]")

class Season(Base):
    __tablename__ = "seasons"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), index=True) # e.g., "Season 1: Cyber Genesis"
    start_date = Column(DateTime, default=datetime.utcnow)
    end_date = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)

class EloHistory(Base):
    __tablename__ = "elo_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    season_id = Column(Integer, ForeignKey("seasons.id"))
    mmr = Column(Float)
    tier = Column(String(50))
    timestamp = Column(DateTime, default=datetime.utcnow)
    match_id = Column(Integer, ForeignKey("matches.id"), nullable=True) # Optional link to what caused the change

    user = relationship("User", foreign_keys=[user_id])
    season = relationship("Season", foreign_keys=[season_id])
    match = relationship("Match", foreign_keys=[match_id])

class Tournament(Base):
    __tablename__ = "tournaments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), index=True)
    game = Column(String(255))
    prize_pool = Column(Float, default=0.0)
    max_players = Column(Integer, default=100)
    entry_fee = Column(Float, default=0.0)
    currency = Column(String(255), default="USD") # USD, INR
    status = Column(String(255), default="Upcoming") # Upcoming, Registration Open, Ongoing, Completed, Cancelled
    reg_start = Column(DateTime, nullable=True)
    reg_end = Column(DateTime, nullable=True)
    match_day = Column(DateTime, nullable=True)
    banner = Column(String(255), nullable=True)
    rules = Column(String(2000), nullable=True)
    match_type = Column(String(255), default="Solo")
    stream_url = Column(String(500), nullable=True)
    
    # Battle Royale Specific
    is_battle_royale = Column(Boolean, default=False)
    team_size = Column(Integer, default=1) # 1=Solo, 2=Duo, 4=Squad
    map_name = Column(String(255), nullable=True)
    
    registrations = relationship("Registration", back_populates="tournament")
    matches = relationship("Match", back_populates="tournament")

    @property
    def approved_count(self):
        return sum(1 for r in self.registrations if r.registration_status == "Approved")


class Registration(Base):
    __tablename__ = "registrations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    tournament_id = Column(Integer, ForeignKey("tournaments.id"))
    registration_status = Column(String(255), default="Pending") # Pending, Approved, Rejected
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    user = relationship("User", back_populates="registrations", foreign_keys=[user_id])
    team = relationship("Team", foreign_keys=[team_id])
    reviewer = relationship("User", foreign_keys=[reviewed_by])
    tournament = relationship("Tournament", back_populates="registrations")

class Match(Base):
    __tablename__ = "matches"

    id = Column(Integer, primary_key=True, index=True)
    tournament_id = Column(Integer, ForeignKey("tournaments.id"))
    match_status = Column(String(255), default="Scheduled") # Scheduled, Ongoing, Completed
    winner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    winner_team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    scores = Column(String(255), nullable=True) # JSON string representation
    
    # Battle Royale Custom Room
    room_id = Column(String(255), nullable=True)
    room_password = Column(String(255), nullable=True)
    
    # 1v1 / Knockout / Triple Threat Stats
    player1_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    player2_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    player3_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Squad Tournaments
    team1_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    team2_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    
    round = Column(Integer, default=1)
    
    disputed = Column(Boolean, default=False)
    dispute_reason = Column(String(500), nullable=True)
    recording_url = Column(String(500), nullable=True) # VOD URL
    
    player1_score = Column(Integer, default=0)
    player2_score = Column(Integer, default=0)
    player3_score = Column(Integer, default=0)
    team1_score = Column(Integer, default=0)
    team2_score = Column(Integer, default=0)
    
    player1_kills = Column(Integer, default=0)
    player2_kills = Column(Integer, default=0)
    player3_kills = Column(Integer, default=0)
    replay_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    tournament = relationship("Tournament", back_populates="matches")
    winner = relationship("User", foreign_keys=[winner_id])
    winner_team = relationship("Team", foreign_keys=[winner_team_id])
    player1 = relationship("User", foreign_keys=[player1_id])
    player2 = relationship("User", foreign_keys=[player2_id])
    player3 = relationship("User", foreign_keys=[player3_id])
    team1 = relationship("Team", foreign_keys=[team1_id])
    team2 = relationship("Team", foreign_keys=[team2_id])
    participants = relationship("MatchParticipant", back_populates="match")

class MatchParticipant(Base):
    __tablename__ = "match_participants"

    id = Column(Integer, primary_key=True, index=True)
    match_id = Column(Integer, ForeignKey("matches.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    
    placement = Column(Integer, default=0)
    kills = Column(Integer, default=0)
    survival_points = Column(Float, default=0.0)
    kill_points = Column(Float, default=0.0)
    total_points = Column(Float, default=0.0)

    match = relationship("Match", back_populates="participants")
    user = relationship("User", foreign_keys=[user_id])
    team = relationship("Team", foreign_keys=[team_id])

class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), index=True)
    captain_id = Column(Integer, ForeignKey("users.id"))
    tournament_id = Column(Integer, ForeignKey("tournaments.id"), nullable=True)
    is_recruiting = Column(Boolean, default=True)
    max_members = Column(Integer, default=4)
    
    captain = relationship("User", foreign_keys=[captain_id])
    tournament = relationship("Tournament", foreign_keys=[tournament_id])
    members = relationship("TeamMember", back_populates="team")
    join_requests = relationship("TeamJoinRequest", back_populates="team")

class TeamMember(Base):
    __tablename__ = "team_members"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    
    team = relationship("Team", back_populates="members")
    user = relationship("User", foreign_keys=[user_id])

class TeamJoinRequest(Base):
    __tablename__ = "team_join_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    status = Column(String(50), default="Pending") # Pending, Approved, Rejected
    created_at = Column(DateTime, default=datetime.utcnow)
    
    team = relationship("Team", back_populates="join_requests")
    user = relationship("User", foreign_keys=[user_id])

class TeamInvite(Base):
    __tablename__ = "team_invites"
    
    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id"))
    inviter_id = Column(Integer, ForeignKey("users.id"))
    invitee_id = Column(Integer, ForeignKey("users.id"))
    status = Column(String(50), default="Pending") # Pending, Accepted, Rejected
    created_at = Column(DateTime, default=datetime.utcnow)
    
    team = relationship("Team")
    inviter = relationship("User", foreign_keys=[inviter_id])
    invitee = relationship("User", foreign_keys=[invitee_id])

class Clan(Base):
    __tablename__ = "clans"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, index=True)
    tag = Column(String(10), unique=True, index=True)
    description = Column(String(1000), nullable=True)
    logo_url = Column(String(500), nullable=True)
    leader_id = Column(Integer, ForeignKey("users.id"))
    
    xp = Column(Integer, default=0)
    level = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_recruiting = Column(Boolean, default=True)
    is_banned = Column(Boolean, default=False)
    ban_reason = Column(String(500), nullable=True)
    
    leader = relationship("User", foreign_keys=[leader_id])
    members = relationship("ClanMember", back_populates="clan")
    join_requests = relationship("ClanJoinRequest", back_populates="clan")
    achievements = relationship("ClanAchievement", back_populates="clan")

class ClanMember(Base):
    __tablename__ = "clan_members"

    id = Column(Integer, primary_key=True, index=True)
    clan_id = Column(Integer, ForeignKey("clans.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    role = Column(String(50), default="Member") # Leader, Co-Leader, Elder, Member
    joined_at = Column(DateTime, default=datetime.utcnow)
    
    clan = relationship("Clan", back_populates="members")
    user = relationship("User", foreign_keys=[user_id])

class ClanJoinRequest(Base):
    __tablename__ = "clan_join_requests"

    id = Column(Integer, primary_key=True, index=True)
    clan_id = Column(Integer, ForeignKey("clans.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    status = Column(String(50), default="Pending") # Pending, Approved, Rejected
    created_at = Column(DateTime, default=datetime.utcnow)
    
    clan = relationship("Clan", back_populates="join_requests")
    user = relationship("User", foreign_keys=[user_id])

class ClanAchievement(Base):
    __tablename__ = "clan_achievements"
    
    id = Column(Integer, primary_key=True, index=True)
    clan_id = Column(Integer, ForeignKey("clans.id"))
    title = Column(String(255))
    description = Column(String(500), nullable=True)
    achieved_at = Column(DateTime, default=datetime.utcnow)
    
    clan = relationship("Clan", back_populates="achievements")

class AIPrediction(Base):
    __tablename__ = "ai_predictions"

    id = Column(Integer, primary_key=True, index=True)
    match_id = Column(Integer, ForeignKey("matches.id"))
    predicted_winner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    confidence_score = Column(Float, default=0.0) # 0.0 to 1.0
    features_used = Column(String(1000)) # JSON string of inputs used for prediction

    created_at = Column(DateTime, default=datetime.utcnow)

    match = relationship("Match", foreign_keys=[match_id])
    predicted_winner = relationship("User", foreign_keys=[predicted_winner_id])

class AntiCheatFlag(Base):
    __tablename__ = "anti_cheat_flags"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    match_id = Column(Integer, ForeignKey("matches.id"), nullable=True)
    reason = Column(String(500))
    severity = Column(String(50), default="High") # High, Medium, Low
    resolved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id])
    match = relationship("Match", foreign_keys=[match_id])

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    amount = Column(Float)
    currency = Column(String(10), default="USD") # USD, INR
    transaction_type = Column(String(50)) # Deposit, Withdrawal, Entry_Fee, Prize_Payout, Superchat
    status = Column(String(50), default="Pending") # Pending, Completed, Failed
    reference_id = Column(String(255), nullable=True) # Stripe intent or Tournament ID
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id])

class Stream(Base):
    __tablename__ = "streams"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    match_id = Column(Integer, ForeignKey("matches.id"), nullable=True)
    platform = Column(String(50)) # Twitch, YouTube
    stream_url = Column(String(500))
    title = Column(String(255), nullable=True)
    viewer_count = Column(Integer, default=0)
    is_live = Column(Boolean, default=False)
    started_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id])
    match = relationship("Match", foreign_keys=[match_id])

class Commentary(Base):
    __tablename__ = "commentary"

    id = Column(Integer, primary_key=True, index=True)
    match_id = Column(Integer, ForeignKey("matches.id"))
    commentator_id = Column(Integer, ForeignKey("users.id"))
    content = Column(String(1000))
    audio_url = Column(String(500), nullable=True) # Optional live audio stream link
    timestamp = Column(DateTime, default=datetime.utcnow)

    match = relationship("Match", foreign_keys=[match_id])
    commentator = relationship("User", foreign_keys=[commentator_id])

class MatchClip(Base):
    __tablename__ = "match_clips"

    id = Column(Integer, primary_key=True, index=True)
    match_id = Column(Integer, ForeignKey("matches.id"))
    stream_id = Column(Integer, ForeignKey("streams.id"), nullable=True)
    clip_url = Column(String(500))
    description = Column(String(255), nullable=True)
    likes_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    match = relationship("Match", foreign_keys=[match_id])
    stream = relationship("Stream", foreign_keys=[stream_id])

class HighlightTimeline(Base):
    __tablename__ = "highlight_timeline"

    id = Column(Integer, primary_key=True, index=True)
    match_id = Column(Integer, ForeignKey("matches.id"))
    event_type = Column(String(100)) # e.g. First Blood, Triple Kill, Objective Secured
    game_timestamp = Column(String(50)) # e.g. "14:02"
    description = Column(String(500))
    created_at = Column(DateTime, default=datetime.utcnow)

    match = relationship("Match", foreign_keys=[match_id])

class Leaderboard(Base):
    __tablename__ = "leaderboards"

    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(Integer, ForeignKey("users.id"))
    tournament_id = Column(Integer, ForeignKey("tournaments.id"))
    points = Column(Integer, default=0)
    wins = Column(Integer, default=0)
    kills = Column(Integer, default=0)
    mvps = Column(Integer, default=0)
    win_rate = Column(Float, default=0.0)
    rank = Column(Integer, nullable=True)

    player = relationship("User", foreign_keys=[player_id])
    tournament = relationship("Tournament", foreign_keys=[tournament_id])

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String(255))
    message = Column(String(500))
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id])

class Superchat(Base):
    __tablename__ = "superchats"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    message = Column(String(500))
    amount = Column(Float)
    currency = Column(String(10), default="INR")
    session_id = Column(String(255), unique=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id])

class StoreItem(Base):
    __tablename__ = "store_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), index=True)
    description = Column(String(1000))
    price = Column(Float)
    image_url = Column(String(500), nullable=True)
    item_type = Column(String(50)) # 'merch', 'badge', 'battlepass', 'ticket'
    stock = Column(Integer, default=-1) # -1 for infinite
    is_active = Column(Boolean, default=True)

class Purchase(Base):
    __tablename__ = "purchases"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    item_id = Column(Integer, ForeignKey("store_items.id"))
    purchase_date = Column(DateTime, default=datetime.utcnow)
    price_paid = Column(Float)
    status = Column(String(50), default="Completed") # Completed, Processing, Delivered

    user = relationship("User", foreign_keys=[user_id])
    item = relationship("StoreItem", foreign_keys=[item_id])

class BattlePassSeason(Base):
    __tablename__ = "battlepass_seasons"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255))
    season_id = Column(Integer, ForeignKey("seasons.id"))
    is_active = Column(Boolean, default=True)

    season = relationship("Season", foreign_keys=[season_id])
    tiers = relationship("BattlePassTier", back_populates="bp_season")

class BattlePassTier(Base):
    __tablename__ = "battlepass_tiers"

    id = Column(Integer, primary_key=True, index=True)
    bp_season_id = Column(Integer, ForeignKey("battlepass_seasons.id"))
    tier_level = Column(Integer)
    required_xp = Column(Integer)
    reward_name = Column(String(255))
    reward_type = Column(String(50)) # 'cosmetic', 'currency', 'badge'
    is_premium = Column(Boolean, default=False)
    
    bp_season = relationship("BattlePassSeason", back_populates="tiers")

class BattlePassProgress(Base):
    __tablename__ = "battlepass_progress"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    bp_season_id = Column(Integer, ForeignKey("battlepass_seasons.id"))
    current_xp = Column(Integer, default=0)
    is_premium_unlocked = Column(Boolean, default=False)

    user = relationship("User", foreign_keys=[user_id])
    bp_season = relationship("BattlePassSeason", foreign_keys=[bp_season_id])

class Friendship(Base):
    __tablename__ = "friendships"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    friend_id = Column(Integer, ForeignKey("users.id"))
    status = Column(String(50), default="Pending") # Pending, Accepted, Blocked
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id])
    friend = relationship("User", foreign_keys=[friend_id])

class DirectMessage(Base):
    __tablename__ = "direct_messages"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"))
    receiver_id = Column(Integer, ForeignKey("users.id"))
    message = Column(String(2000))
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    sender = relationship("User", foreign_keys=[sender_id])
    receiver = relationship("User", foreign_keys=[receiver_id])

class MatchMVPVote(Base):
    __tablename__ = "match_mvp_votes"

    id = Column(Integer, primary_key=True, index=True)
    match_id = Column(Integer, ForeignKey("matches.id"))
    spectator_id = Column(Integer, ForeignKey("users.id"))
    player_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    match = relationship("Match", foreign_keys=[match_id])
    spectator = relationship("User", foreign_keys=[spectator_id])
    player = relationship("User", foreign_keys=[player_id])

class FantasyTeam(Base):
    __tablename__ = "fantasy_teams"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String(255))
    score = Column(Float, default=0.0)
    budget_remaining = Column(Integer, default=10000)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id])
    roster = relationship("FantasyTeamRoster", back_populates="fantasy_team")

class FantasyTeamRoster(Base):
    __tablename__ = "fantasy_team_roster"

    id = Column(Integer, primary_key=True, index=True)
    fantasy_team_id = Column(Integer, ForeignKey("fantasy_teams.id"))
    player_id = Column(Integer, ForeignKey("users.id"))

    fantasy_team = relationship("FantasyTeam", back_populates="roster")
    player = relationship("User", foreign_keys=[player_id])

class PlayerPortfolio(Base):
    __tablename__ = "player_portfolios"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    bio = Column(String(1000), nullable=True)
    preferred_roles = Column(String(255), nullable=True) # e.g., "Sniper, IGL"
    past_teams = Column(String(500), nullable=True)
    hardware_specs = Column(String(500), nullable=True)
    looking_for_team = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id])

class ProTeamApplication(Base):
    __tablename__ = "pro_team_applications"

    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(Integer, ForeignKey("users.id"))
    team_id = Column(Integer, ForeignKey("teams.id"))
    cover_letter = Column(String(1000), nullable=True)
    status = Column(String(50), default="Pending") # Pending, Accepted, Rejected
    created_at = Column(DateTime, default=datetime.utcnow)

    player = relationship("User", foreign_keys=[player_id])
    team = relationship("Team", foreign_keys=[team_id])

class PlayerContract(Base):
    __tablename__ = "player_contracts"

    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(Integer, ForeignKey("users.id"))
    team_id = Column(Integer, ForeignKey("teams.id"))
    salary = Column(Float, default=0.0)
    duration_months = Column(Integer, default=12)
    buyout_clause = Column(Float, default=0.0)
    streaming_rights = Column(String(255), nullable=True)
    status = Column(String(50), default="Offered") # Offered, Signed, Terminated, Expired
    signed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    player = relationship("User", foreign_keys=[player_id])
    team = relationship("Team", foreign_keys=[team_id])

class SupportTicket(Base):
    __tablename__ = "support_tickets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    subject = Column(String(255))
    description = Column(String(2000))
    category = Column(String(50)) # "Bug Report", "Match Dispute", "General Support"
    status = Column(String(50), default="Open") # "Open", "In Progress", "Resolved"
    bounty_awarded = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id])

class CommsLog(Base):
    __tablename__ = "comms_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    type = Column(String(50)) # "Email", "SMS", "WhatsApp"
    to = Column(String(255))
    content = Column(String(2000))
    status = Column(String(255)) # "Success", "Failed", "Mocked"

class VoiceRoom(Base):
    __tablename__ = "voice_rooms"

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(String(255), unique=True, index=True) # WebRTC/Twilio room ID
    room_type = Column(String(50)) # "Team", "Tournament", "Global"
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    tournament_id = Column(Integer, ForeignKey("tournaments.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    team = relationship("Team", foreign_keys=[team_id])
    tournament = relationship("Tournament", foreign_keys=[tournament_id])

class WithdrawalRequest(Base):
    __tablename__ = "withdrawal_requests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    amount = Column(Float)
    withdrawal_method = Column(String(50)) # "UPI" or "Bank Account"
    withdrawal_details = Column(String(500)) # Encrypted or secure reference to details
    status = Column(String(50), default="Pending") # "Pending", "Approved", "Rejected", "Completed"
    admin_notes = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id])

class Referral(Base):
    __tablename__ = "referrals"

    id = Column(Integer, primary_key=True, index=True)
    referrer_id = Column(Integer, ForeignKey("users.id"))
    referee_id = Column(Integer, ForeignKey("users.id"))
    reward_amount = Column(Float, default=0.0)
    status = Column(String(50), default="Pending") # "Pending", "Completed"
    created_at = Column(DateTime, default=datetime.utcnow)

    referrer = relationship("User", foreign_keys=[referrer_id])
    referee = relationship("User", foreign_keys=[referee_id])

class UserSubscription(Base):
    __tablename__ = "user_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    plan_tier = Column(String(50)) # "Premium", "Elite", "BattlePass"
    start_date = Column(DateTime, default=datetime.utcnow)
    end_date = Column(DateTime)
    is_active = Column(Boolean, default=True)
    auto_renew = Column(Boolean, default=True)

    user = relationship("User", foreign_keys=[user_id])

class TournamentTicket(Base):
    __tablename__ = "tournament_tickets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    tournament_id = Column(Integer, ForeignKey("tournaments.id"))
    ticket_tier = Column(String(50)) # "General", "VIP", "Backstage"
    price_paid = Column(Float)
    qr_code_hash = Column(String(255), unique=True)
    status = Column(String(50), default="Valid") # "Valid", "Used", "Refunded"
    purchased_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id])
    tournament = relationship("Tournament", foreign_keys=[tournament_id])

class ScoutReport(Base):
    __tablename__ = "scout_reports"

    id = Column(Integer, primary_key=True, index=True)
    scout_id = Column(Integer, ForeignKey("users.id"))
    player_id = Column(Integer, ForeignKey("users.id"))
    rating = Column(Integer) # 1 to 10
    potential_score = Column(Integer) # 1 to 100
    internal_notes = Column(String(2000))
    created_at = Column(DateTime, default=datetime.utcnow)

    scout = relationship("User", foreign_keys=[scout_id])
    player = relationship("User", foreign_keys=[player_id])

class TrustedDevice(Base):
    __tablename__ = "trusted_devices"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    device_fingerprint = Column(String(255), index=True)
    device_name = Column(String(255))
    ip_address = Column(String(50))
    is_trusted = Column(Boolean, default=True)
    last_active = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id])

class OAuthIntegration(Base):
    __tablename__ = "oauth_integrations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    provider = Column(String(50)) # "Twitch", "Discord", "YouTube"
    access_token = Column(String(1000))
    refresh_token = Column(String(1000), nullable=True)
    scopes = Column(String(500), nullable=True)
    expires_at = Column(DateTime, nullable=True)

    user = relationship("User", foreign_keys=[user_id])


class TournamentHighlight(Base):
    __tablename__ = "tournament_highlights"

    id = Column(Integer, primary_key=True, index=True)
    tournament_id = Column(Integer, ForeignKey("tournaments.id"))
    video_url = Column(String(500))
    title = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)

