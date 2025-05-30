from pydantic import BaseModel

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

class HabitCreate(BaseModel):
    name: str
    description: Optional[str] = None
    reward_coins: int = 1

class HabitResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    reward_coins: int
    is_active: bool
    created_at: str
    completed_today: bool = False

class HabitCompletion(BaseModel):
    habit_id: int