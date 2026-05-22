from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Float, DateTime
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
    
    # Career Stats
    wins = Column(Integer, default=0)
    losses = Column(Integer, default=0)
    kills = Column(Integer, default=0)
    mvps = Column(Integer, default=0)
    achievements = Column(String(1000), nullable=True)
    is_flagged = Column(Boolean, default=False)

    registrations = relationship("Registration", back_populates="user", foreign_keys="[Registration.user_id]")

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
    
    registrations = relationship("Registration", back_populates="tournament")
    matches = relationship("Match", back_populates="tournament")

class Registration(Base):
    __tablename__ = "registrations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    tournament_id = Column(Integer, ForeignKey("tournaments.id"))
    registration_status = Column(String(255), default="Pending") # Pending, Approved, Rejected
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    user = relationship("User", back_populates="registrations", foreign_keys=[user_id])
    reviewer = relationship("User", foreign_keys=[reviewed_by])
    tournament = relationship("Tournament", back_populates="registrations")

class Match(Base):
    __tablename__ = "matches"

    id = Column(Integer, primary_key=True, index=True)
    tournament_id = Column(Integer, ForeignKey("tournaments.id"))
    match_status = Column(String(255), default="Scheduled") # Scheduled, Ongoing, Completed
    winner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    scores = Column(String(255), nullable=True) # JSON string representation
    
    # 1v1 / Knockout Bracket Stats
    player1_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    player2_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    round = Column(Integer, default=1)
    
    disputed = Column(Boolean, default=False)
    dispute_reason = Column(String(500), nullable=True)
    
    player1_score = Column(Integer, default=0)
    player2_score = Column(Integer, default=0)
    player1_kills = Column(Integer, default=0)
    player2_kills = Column(Integer, default=0)
    replay_url = Column(String(500), nullable=True)
    
    tournament = relationship("Tournament", back_populates="matches")
    winner = relationship("User", foreign_keys=[winner_id])
    player1 = relationship("User", foreign_keys=[player1_id])
    player2 = relationship("User", foreign_keys=[player2_id])

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
