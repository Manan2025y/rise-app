import random
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel

import models
import schemas
from database import engine, get_db

# Initialize Database Tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Rise OS API")

# Enable CORS for cross-platform clients (Desktop/Tauri, Mobile/Expo)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# Simple Auth Helper
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    user = db.query(models.DBUser).filter(models.DBUser.email == token).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

# --- Auth Routes ---
@app.post("/register", response_model=schemas.User)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.DBUser).filter(models.DBUser.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    new_user = models.DBUser(
        email=user.email,
        hashed_password=user.password # Simple password storage for demo scope
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.DBUser).filter(models.DBUser.email == form_data.username).first()
    if not user or user.hashed_password != form_data.password:
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    return {"access_token": user.email, "token_type": "bearer"}

@app.get("/users/me", response_model=schemas.User)
def get_me(current_user: models.DBUser = Depends(get_current_user)):
    return current_user

# --- Task Routes ---
@app.get("/tasks", response_model=List[schemas.Task])
def get_tasks(current_user: models.DBUser = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(models.DBTask).filter(
        models.DBTask.owner_id == current_user.id,
        models.DBTask.is_deleted == False
    ).all()

@app.post("/tasks", response_model=schemas.Task)
def create_task(task: schemas.TaskCreate, current_user: models.DBUser = Depends(get_current_user), db: Session = Depends(get_db)):
    db_task = models.DBTask(**task.model_dump(), owner_id=current_user.id)
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

@app.delete("/tasks/{task_id}")
def delete_task(task_id: int, current_user: models.DBUser = Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.query(models.DBTask).filter(
        models.DBTask.id == task_id,
        models.DBTask.owner_id == current_user.id
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task.is_deleted = True
    task.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {"status": "success"}

# --- Habit Routes ---
@app.get("/habits", response_model=List[schemas.Habit])
def get_habits(current_user: models.DBUser = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(models.DBHabit).filter(
        models.DBHabit.owner_id == current_user.id,
        models.DBHabit.is_deleted == False
    ).all()

@app.post("/habits", response_model=schemas.Habit)
def create_habit(habit: schemas.HabitCreate, current_user: models.DBUser = Depends(get_current_user), db: Session = Depends(get_db)):
    db_habit = models.DBHabit(**habit.model_dump(), owner_id=current_user.id)
    db.add(db_habit)
    db.commit()
    db.refresh(db_habit)
    return db_habit

# --- Focus Session & XP Routes ---
@app.post("/focus/complete", response_model=schemas.User)
def complete_focus_session(session_data: schemas.FocusSessionCreate, current_user: models.DBUser = Depends(get_current_user), db: Session = Depends(get_db)):
    xp_reward = session_data.duration_minutes * 2
    points_reward = session_data.duration_minutes
    
    new_session = models.DBFocusSession(
        owner_id=current_user.id,
        duration_minutes=session_data.duration_minutes,
        xp_earned=xp_reward
    )
    
    current_user.xp += xp_reward
    current_user.points += points_reward
    
    db.add(new_session)
    db.commit()
    db.refresh(current_user)
    return current_user

# --- Delta Sync Engine ---
class SyncPushPayload(BaseModel):
    tasks: List[schemas.TaskCreate] = []

@app.get("/sync/pull")
def sync_pull(since: Optional[str] = None, current_user: models.DBUser = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(models.DBTask).filter(models.DBTask.owner_id == current_user.id)
    
    if since:
        try:
            since_dt = datetime.fromisoformat(since)
            query = query.filter(models.DBTask.updated_at >= since_dt)
        except ValueError:
            pass
            
    tasks = query.all()
    server_time = datetime.now(timezone.utc).isoformat()
    return {"server_time": server_time, "tasks": tasks}

# --- Motivation Quotes ---
DEFAULT_QUOTES = [
    {"quote": "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", "author": "Aristotle"},
    {"quote": "The secret of getting ahead is getting started.", "author": "Mark Twain"},
    {"quote": "Focus is a muscle. The more you practice it, the stronger it gets.", "author": "Anonymous"},
    {"quote": "Small daily improvements over time lead to stunning results.", "author": "Robin Sharma"}
]

@app.get("/quotes/random")
def get_random_quote():
    return random.choice(DEFAULT_QUOTES)

# Mount Static UI Files
app.mount("/static", StaticFiles(directory="static"), name="static")
