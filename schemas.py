from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# --- User Schemas ---
class UserCreate(BaseModel):
    email: str
    password: str

class User(BaseModel):
    id: int
    email: str
    points: int
    xp: int
    streak_days: int

    class Config:
        from_attributes = True

# --- Task Schemas ---
class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    priority: Optional[str] = "medium"
    due_date: Optional[datetime] = None
    points_value: Optional[int] = 10

class Task(TaskCreate):
    id: int
    completed: bool
    owner_id: int
    updated_at: datetime
    is_deleted: bool

    class Config:
        from_attributes = True

# --- Habit Schemas ---
class HabitCreate(BaseModel):
    title: str
    frequency: Optional[str] = "daily"

class Habit(HabitCreate):
    id: int
    current_streak: int
    last_completed: Optional[datetime] = None
    owner_id: int

    class Config:
        from_attributes = True

# --- Focus Session Schemas ---
class FocusSessionCreate(BaseModel):
    duration_minutes: int

class FocusSession(FocusSessionCreate):
    id: int
    completed_at: datetime
    xp_earned: int
    owner_id: int

    class Config:
        from_attributes = True
        