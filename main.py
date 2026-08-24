from datetime import datetime, timedelta, timezone
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
import jwt
from pwdlib import PasswordHash
from pwdlib.hashers.argon2 import Argon2Hasher
from sqlalchemy.orm import Session
from typing import List

import models, schemas
from database import SessionLocal, engine

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Rise API")

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# --- Add this right after app = FastAPI(title="Rise API") ---
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
def read_root():
    return FileResponse("static/index.html")

SECRET_KEY = "super-secret-rise-key-change-this-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

password_hash = PasswordHash((Argon2Hasher(),))
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def hash_password(password: str) -> str:
    return password_hash.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return password_hash.verify(plain_password, hashed_password)
    except Exception:
        return False

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

@app.get("/")
def read_root():
    return {"status": "online", "project": "Rise"}

# --- User Registration ---
@app.post("/register", response_model=schemas.User)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.DBUser).filter(models.DBUser.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_pwd = hash_password(user.password)
    new_user = models.DBUser(email=user.email, hashed_password=hashed_pwd)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

# --- User Login ---
@app.post("/login")
def login_user(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.DBUser).filter(models.DBUser.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

# --- Helper to get current authenticated user ---
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except Exception:
        raise credentials_exception
        
    user = db.query(models.DBUser).filter(models.DBUser.email == email).first()
    if user is None:
        raise credentials_exception
    return user

# --- Protected Task Routes ---
@app.get("/tasks", response_model=List[schemas.Task])
def get_user_tasks(current_user: models.DBUser = Depends(get_current_user), db: Session = Depends(get_db)):
    # Returns ONLY tasks created by the logged-in user
    return db.query(models.DBTask).filter(models.DBTask.owner_id == current_user.id).all()

@app.post("/tasks", response_model=schemas.Task)
def create_task(task: schemas.TaskCreate, current_user: models.DBUser = Depends(get_current_user), db: Session = Depends(get_db)):
    # Automatically links the new task to current_user.id
    db_task = models.DBTask(**task.model_dump(), owner_id=current_user.id)
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

@app.delete("/tasks/{task_id}")
def delete_task(task_id: int, current_user: models.DBUser = Depends(get_current_user), db: Session = Depends(get_db)):
    task_query = db.query(models.DBTask).filter(
        models.DBTask.id == task_id, 
        models.DBTask.owner_id == current_user.id
    )
    db_task = task_query.first()
    
    if db_task is None:
        raise HTTPException(status_code=404, detail="Task not found or unauthorized")
        
    task_query.delete(synchronize_session=False)
    db.commit()
    return {"detail": f"Task {task_id} successfully deleted"}