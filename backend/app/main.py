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

# Configuración de CORS
# 🔹 Para pruebas puedes dejar allow_origins=["*"]
# 🔹 Para producción es mejor poner la URL exacta de tu frontend en Render
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://webpuntoscriticos.onrender.com",  # URL pública de tu frontend
    ],
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
