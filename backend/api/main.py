import sys
import asyncio
import logging

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    stream=sys.stdout,
)

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database.connection import init_pool, close_pool

from .routes.auth_router import router as auth_router
from .routes.user_router import router as users_router
from .routes.suppliers_router import router as suppliers_router
from .routes.technical_lots_router import router as technical_lots_router
from .routes.tsl_router import router as tsl_router
from .routes.tender_router import router as tender_router
from .routes.email_router import router as email_router
from .routes.pdf_router import router as pdf_router
from .routes.tender_document_router import router as tender_document_router
from .routes.tender_product_router import router as tender_product_router
from .routes.datasheet_router import router as datasheet_router
from .routes.supplier_product_router import router as supplier_product_router
from .routes.compare_router import router as compare_router 

# Import du scheduler
from services.blacklist_service import start_blacklist_purge_scheduler

# Variable pour stocker la tâche de purge
_purge_task = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global _purge_task

    # Initialisation du pool de connexions
    await init_pool()

    # Démarrer le job de purge de la blacklist (toutes les 24h, retention 8h)
    _purge_task = asyncio.create_task(
        start_blacklist_purge_scheduler(interval_hours=24, retention_hours=8)
    )

    yield

    # Arrêt du scheduler
    if _purge_task:
        _purge_task.cancel()
        try:
            await _purge_task
        except asyncio.CancelledError:
            pass

    # Fermeture du pool
    await close_pool()

# Création de l'application FastAPI
app = FastAPI(
    title="Tendering API",
    description="API pour le traitement des appels d'offres et fiches techniques",
    version="1.0.0",
    lifespan=lifespan,
)

# Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclusion des routes
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(suppliers_router)
app.include_router(technical_lots_router)
app.include_router(tsl_router)
app.include_router(tender_router)
app.include_router(email_router)
app.include_router(pdf_router)
app.include_router(tender_document_router)
app.include_router(tender_product_router)
app.include_router(datasheet_router)
app.include_router(supplier_product_router)
app.include_router(compare_router)


@app.get("/")
async def root():
    return {
        "message": "Tendering API is running",
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    import asyncio
    import sys
    import uvicorn
    from core.config import API_HOST, API_PORT, API_DEBUG

    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

    config = uvicorn.Config(
        "api.main:app",
        host=API_HOST,
        port=API_PORT,
        reload=False, 
    )
    server = uvicorn.Server(config)
    asyncio.run(server.serve())