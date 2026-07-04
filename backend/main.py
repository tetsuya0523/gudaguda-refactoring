from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from elasticsearch import Elasticsearch

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ES_URL = os.getenv("ELASTICSEARCH_URL", "http://localhost:9200")

# ❌ 起動時に作らない
es_client = None


@app.on_event("startup")
def startup():
    global es_client
    try:
        es_client = Elasticsearch(ES_URL)
        print("[INFO] Elasticsearch client initialized")
    except Exception as e:
        print("[WARN] Elasticsearch init failed:", e)
        es_client = None


@app.get("/")
def read_root():
    return {"message": "Gudaguda Refactoring Backend is running!"}


@app.get("/health/db")
def health_db():
    if es_client is None:
        return {"status": "error", "message": "ES not initialized"}

    try:
        return {"status": "ok", "db_info": es_client.info()}
    except Exception as e:
        return {"status": "error", "message": str(e)}