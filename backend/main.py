from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from elasticsearch import Elasticsearch

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ES_URL = os.getenv("ELASTICSEARCH_URL", "http://localhost:9200")
es_client = Elasticsearch(ES_URL)

@app.get("/")
def read_root():
    return {"message": "Gudaguda Refactoring Backend is running!"}

@app.get("/health/db")
def health_db():
    try:
        info = es_client.info()
        return {"status": "ok", "db_info": info}
    except Exception as e:
        return {"status": "error", "message": str(e)}
