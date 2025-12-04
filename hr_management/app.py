import uvicorn
from api.routes import app
from config.settings import settings


if __name__ == "__main__":
    print(f"""
╔══════════════════════════════════════════════╗
║   🚀 HR Management System Starting...       ║
║   Environment: {settings.environment.upper():<28} ║
║   Host: {settings.api_host:<34} ║
║   Port: {settings.api_port:<34} ║
╚══════════════════════════════════════════════╝
    """)
    
    uvicorn.run(
        "api.routes:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=True if settings.environment == "development" else False,
        log_level="info"
    )
