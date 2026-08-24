from pydantic import BaseModel, EmailStr
from typing import Optional, List

# --- Task Schemas ---
class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    points: int = 10
    completed: bool = False

class TaskCreate(TaskBase):
    pass

class Task(TaskBase):
    id: int
    owner_id: Optional[int] = None

    class Config:
        from_attributes = True


# --- User Schemas ---
class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    is_active: bool
    tasks: List[Task] = []

    class Config:
        from_attributes = True