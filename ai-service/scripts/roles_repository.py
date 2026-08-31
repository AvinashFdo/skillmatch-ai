import os

from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

_client = None


def _get_collection():
    global _client

    if _client is None:
        mongodb_uri = os.environ.get("MONGODB_URI")
        if not mongodb_uri:
            raise RuntimeError(
                "MONGODB_URI is not set. Copy .env.example to .env and fill it in."
            )
        _client = MongoClient(mongodb_uri)

    return _client.get_default_database()["roles"]


def fetch_all_roles() -> list:
    documents = _get_collection().find()

    return [
        {
            "role_id": str(doc["_id"]),
            "role_name": doc["role_name"],
            "description": doc.get("description", ""),
            "technical_skills": doc.get("technical_skills", []),
            "soft_skills": doc.get("soft_skills", []),
            "learning_resources": doc.get("learning_resources", []),
            "portfolio_projects": doc.get("portfolio_projects", []),
        }
        for doc in documents
    ]
