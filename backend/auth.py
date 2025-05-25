from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta

# Konfiguracja
SECRET_KEY = "super-secret-key-for-habi-app"
ALGORITHM = "HS256"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    """Hashuje hasło"""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Sprawdza hasło"""
    return pwd_context.verify(plain_password, hashed_password)

def create_token(user_id: int) -> str:
    """Tworzy prosty JWT token"""
    expire = datetime.utcnow() + timedelta(days=30)
    data = {"sub": str(user_id), "exp": expire}
    return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(token: str) -> int:
    """Weryfikuje token i zwraca user_id"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub"))
        return user_id
    except:
        return None