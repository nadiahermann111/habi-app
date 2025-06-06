from pydantic import BaseModel
from typing import Optional, List

# User schemas
class UserRegister(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    coins: int

class LoginResponse(BaseModel):
    message: str
    token: str
    user: UserResponse

# Habit schemas
class HabitCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    coin_value: int = 1
    icon: str = "🎯"

class HabitResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    coin_value: int
    icon: str
    is_active: bool
    created_at: str
    completion_dates: List[str] = []

class HabitComplete(BaseModel):
    habit_id: int

class HabitUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    coin_value: Optional[int] = None
    icon: Optional[str] = None
    is_active: Optional[bool] = None

class HabitCompletionResponse(BaseModel):
    message: str
    coins_earned: int
    total_coins: int
    completion_date: str