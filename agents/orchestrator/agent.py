from google.adk.agents import Agent
from agents.task_extractor.agent import root_agent as task_extractor_agent
from agents.task_proposer.agent import root_agent as task_proposer_agent

root_agent = Agent(
    name="gudaguda_orchestrator",
    model="gemini-2.5-flash",
    description="ユーザーの意図を判断し、適切なサブエージェントに処理を振り分けるオーケストレーター",
    instruction="""
あなたはユーザーの入力を分析して、適切なエージェントに処理を委譲するオーケストレーターです。

振り分けルール：
- ボイスメモ・メモ・雑多なテキスト・「〜したい」「〜を買う」など未整理の入力 → gudaguda_task_extractor に委譲
- 「何をすればいい？」「グダグダしてる」「今何をやる？」など提案を求める入力 → gudaguda_task_proposer に委譲

委譲する際は余計な前置きなく、すぐにサブエージェントに処理させてください。
""",
    sub_agents=[task_extractor_agent, task_proposer_agent],
)
