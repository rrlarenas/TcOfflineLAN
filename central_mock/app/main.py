from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from app.routers import health, users, episodes, hl7
from app.db import init_db, get_db

app = FastAPI(
    title="TrakCare Central Mock",
    description="Servicio central mock para recibir y procesar mensajes HL7 desde sistemas offline",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()

app.include_router(health.router)
app.include_router(users.router)
app.include_router(episodes.router)
app.include_router(hl7.router)


@app.get("/demo01/tcoffline/getUsers")
def get_users_compat(db: Session = Depends(get_db)):
    """
    Compatibility endpoint matching the real central server path.
    Returns users in the format expected by offline backends.
    """
    from app import models
    active_users = db.query(models.CentralUser).filter(models.CentralUser.active == True).all()
    return [
        {
            "idUsuario": str(u.id),
            "username": u.username,
            "descripcion": u.nombre or u.username,
            "active": "Y" if u.active else "N",
            "password": u.plain_password or "",
            "passwordSalt": "",
            "cpRut": "",
            "cpNombre": u.nombre or "",
            "cpTipoProfesional": "",
        }
        for u in active_users
    ]


@app.get("/")
def root():
    return {
        "message": "TrakCare Central Mock API",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": {
            "health": "/central/health",
            "users": "/central/users",
            "getUsers": "/demo01/tcoffline/getUsers",
            "episodes": "/central/episodes",
            "hl7": "/central/hl7"
        }
    }
