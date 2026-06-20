import uuid
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from elasticsearch import Elasticsearch

from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

from agents.task_extractor.agent import root_agent as task_extractor_agent
from agents.task_proposer.agent import root_agent as task_proposer_agent
from agents.orchestrator.agent import root_agent as orchestrator_agent

# --- Elasticsearch ---
ES_URL = os.getenv("ELASTICSEARCH_URL", "http://localhost:9200")
es_client = Elasticsearch(ES_URL)

# --- ADK ---
APP_NAME = "gudaguda"
session_service = InMemorySessionService()
extractor_runner = Runner(agent=task_extractor_agent, app_name=APP_NAME, session_service=session_service)
proposer_runner = Runner(agent=task_proposer_agent, app_name=APP_NAME, session_service=session_service)
orchestrator_runner = Runner(agent=orchestrator_agent, app_name=APP_NAME, session_service=session_service)


async def call_agent(runner: Runner, message: str) -> str:
    session_id = str(uuid.uuid4())
    await session_service.create_session(
        app_name=APP_NAME,
        user_id="user",
        session_id=session_id,
    )
    content = types.Content(role="user", parts=[types.Part(text=message)])
    response_text = ""
    async for event in runner.run_async(
        user_id="user",
        session_id=session_id,
        new_message=content,
    ):
        if event.is_final_response():
            if event.response and event.response.parts:
                response_text = event.response.parts[0].text
    return response_text


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title="ぐだぐだリファクタリングAPI", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- ヘルスチェック ---

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


# --- ADK エンドポイント ---

class ExtractRequest(BaseModel):
    text: str


class ProposeRequest(BaseModel):
    message: str = "今グダグダしてる。何かやることある？"


class ChatRequest(BaseModel):
    message: str


@app.post("/api/extract")
async def extract_tasks(req: ExtractRequest):
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="text is required")
    response = await call_agent(extractor_runner, req.text)
    return {"response": response}


@app.post("/api/propose")
async def propose_tasks(req: ProposeRequest):
    response = await call_agent(proposer_runner, req.message)
    return {"response": response}


@app.post("/api/chat")
async def chat(req: ChatRequest):
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="message is required")
    response = await call_agent(orchestrator_runner, req.message)
    return {"response": response}
