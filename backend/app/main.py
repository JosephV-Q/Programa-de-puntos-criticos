from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth.database import create_admin
from app.auth.router import router as auth_router
from app.routers import router

app = FastAPI(
    title="Sistema de Puntos Críticos",
    version="0.1.0",
    description="API para simular vibraciones y zonas críticas en el puente atirantado",
)


@app.on_event("startup")
def bootstrap_admin() -> None:
    create_admin()

# Configuración de CORS para permitir llamadas desde tu frontend (Vite en localhost)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|0\.0\.0\.0|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluye las rutas definidas en app/routers.py
app.include_router(router)
app.include_router(auth_router)

# Endpoint raíz opcional para verificar que el backend está vivo
@app.get("/")
async def root():
    return {"message": "Backend del Sistema de Puntos Críticos activo"}
