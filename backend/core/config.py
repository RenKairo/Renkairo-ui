import os

class Settings:
    PROJECT_NAME: str = "RenKairo"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    ROOT_DIR: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

settings = Settings()
