"""
roles_repository.py
--------------------
Single source of truth for reading role data from MongoDB - the
`roles` collection managed by the backend's Mongoose Role model
(backend/src/models/Role.js) and edited through the admin panel.

Role data used to live in career_roles.json and was read directly by
skill_extractor.py and role_fit_scorer.py. It now lives in MongoDB so
that admin panel edits are immediately visible to the next /analyze
call. career_roles.json still exists as the original seed data used by
the one-time migration script (backend/scripts/migrateRoles.js), but is
no longer read by any live code path.

Architecture note: the AI service connects to MongoDB directly here,
rather than fetching role data through the backend's API. This was
chosen over the alternative (AI service calls backend, backend calls AI
service for /analyze - a circular HTTP dependency) since both services
already have access to the same Atlas cluster, and reading shared
reference data directly is simpler than adding an internal HTTP client
+ caching layer for what is otherwise a two-line database query.
"""

import os

from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

_client = None


def _get_collection():
    """
    Lazily creates a single, reused MongoClient for the process's
    lifetime (mirroring how the Node backend keeps one open mongoose
    connection), rather than opening a new connection per request.
    """
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
    """
    Returns all roles from MongoDB, shaped identically to how
    career_roles.json's "roles" list used to look - a list of dicts
    with role_id, role_name, description, technical_skills, soft_skills,
    learning_resources, and portfolio_projects - so the rest of the
    pipeline (skill_extractor, role_fit_scorer) needed no further
    changes beyond swapping their JSON-file read for a call to this
    function.

    Mongo's own ObjectId (stringified) replaces the JSON file's
    role_id field - there's no reason to keep a separate identifier
    now that the data lives in a database that already provides one.
    """
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
