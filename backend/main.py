from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from datetime import datetime
from elasticsearch import Elasticsearch

app = FastAPI(title="ぐだぐだリファクタリングAPI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ES_URL = os.getenv("ELASTICSEARCH_URL", "http://localhost:9200")
es_client = Elasticsearch(ES_URL)


class ExtractRequest(BaseModel):
    text: str


class ProposeRequest(BaseModel):
    message: str = ""


@app.get("/")
def read_root():
    return {"message": "ぐだぐだリファクタリング Backend is running!"}


@app.get("/health/db")
def health_db():
    try:
        info = es_client.info()
        return {"status": "ok", "db_info": info}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.post("/api/extract")
async def extract_tasks(req: ExtractRequest):
    # TODO: ADK task_extractor agent に接続する
    return {
        "tasks": [
            {"title": "買い物に行く", "category": "買い物", "estimated_minutes": 60},
            {"title": "メールを返信する", "category": "仕事", "estimated_minutes": 15},
            {"title": "部屋を掃除する", "category": "家事", "estimated_minutes": 45},
        ]
    }


@app.post("/api/propose")
async def propose_tasks(req: ProposeRequest):
    # TODO: ADK task_proposer agent に接続する
    now = datetime.now()
    hour = now.hour
    if 5 <= hour < 12:
        time_label = "午前"
    elif 12 <= hour < 18:
        time_label = "午後"
    elif 18 <= hour < 22:
        time_label = "夜"
    else:
        time_label = "深夜"

    return {
        "message": f"{time_label}の今こそ、小さな一歩を踏み出しましょう！",
        "tasks": [
            {"title": "デスクを5分だけ片付ける", "reason": "小さな達成感が次の行動につながります"},
            {"title": "水を一杯飲む", "reason": "まず体を動かすことで気分が切り替わります"},
            {"title": "タスクリストを書き出す", "reason": "頭の中を整理するだけで楽になります"},
        ],
    }
