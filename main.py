import os
from dotenv import load_dotenv
from fastapi import FastAPI
from app.routes import router

load_dotenv()

OCR_HOST = os.getenv("OCR_HOST", "0.0.0.0")
OCR_PORT = int(os.getenv("OCR_PORT", "5000"))

app = FastAPI(title="OCR Service")

app.include_router(router)


@app.get("/")
def root():
    return {
        "service": "OCR Service",
        "status": "running",
        "ts_backend_url": os.getenv("TS_BACKEND_URL", "not configured"),
        "auth_configured": bool(os.getenv("INTERNAL_AUTH_TOKEN")),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=OCR_HOST, port=OCR_PORT, reload=False)
