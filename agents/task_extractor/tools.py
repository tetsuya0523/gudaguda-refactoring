def save_extracted_tasks(tasks: list) -> dict:
    """抽出したタスクをストアに保存する（TODO: Firestoreに接続）"""
    return {
        "success": True,
        "saved_count": len(tasks),
        "tasks": tasks,
    }
