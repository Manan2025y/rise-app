from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Float, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base

def utc_now():
    return datetime.now(timezone.utc)

class DBUser(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    
    # User Progress & Gamification
    points = Column(Integer, default=0)
    xp = Column(Integer, default=0)
    streak_days = Column(Integer, default=0)
    last_active_date = Column(DateTime, default=utc_now)

    # Relationships
    tasks = relationship("DBTask", back_populates="owner")
    habits = relationship("DBHabit", back_populates="owner")
    focus_sessions = relationship("DBFocusSession", back_populates="owner")

class DBTask(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    priority = Column(String, default="medium")  # low, medium, high
    due_date = Column(DateTime, nullable=True)
    completed = Column(Boolean, default=False)
    points_value = Column(Integer, default=10)
    
    # Sync & Tracking
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    is_deleted = Column(Boolean, default=False)

    owner = relationship("DBUser", back_populates="tasks")

class DBHabit(Base):
    __tablename__ = "habits"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    frequency = Column(String, default="daily")  # daily, weekly
    current_streak = Column(Integer, default=0)
    last_completed = Column(DateTime, nullable=True)
    
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    is_deleted = Column(Boolean, default=False)

    owner = relationship("DBUser", back_populates="habits")

class DBFocusSession(Base):
    __tablename__ = "focus_sessions"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    completed_at = Column(DateTime, default=utc_now)
    xp_earned = Column(Integer, default=25)

    owner = relationship("DBUser", back_populates="focus_sessions")

class DBMotivationQuote(Base):
    __tablename__ = "motivation_quotes"

    id = Column(Integer, primary_key=True, index=True)
    quote = Column(Text, nullable=False)
    author = Column(String, default="Anonymous")
    category = Column(String, default="General")