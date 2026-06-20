from datetime import datetime


def get_current_context() -> dict:
    now = datetime.now()
    hour = now.hour
    weekday = now.weekday()  # 0=月曜, 6=日曜

    if 5 <= hour < 12:
        time_of_day = "朝"
    elif 12 <= hour < 18:
        time_of_day = "昼"
    elif 18 <= hour < 22:
        time_of_day = "夜"
    else:
        time_of_day = "深夜"

    return {
        "current_time": now.strftime("%H:%M"),
        "time_of_day": time_of_day,
        "weekday": now.strftime("%A"),
        "is_weekend": weekday >= 5,
    }


def get_pending_tasks() -> dict:
    # TODO: Firestoreから実データを取得する
    return {
        "tasks": [
            {"id": 1, "title": "ADKのドキュメントを読む", "category": "学習", "location": "どこでも", "estimated_minutes": 30},
            {"id": 2, "title": "スーパーで買い物", "category": "買い物", "location": "外出", "estimated_minutes": 45},
            {"id": 3, "title": "チームに進捗報告", "category": "仕事", "location": "どこでも", "estimated_minutes": 15},
            {"id": 4, "title": "30分ランニング", "category": "運動", "location": "外出", "estimated_minutes": 30},
            {"id": 5, "title": "部屋の片付け", "category": "家事", "location": "家", "estimated_minutes": 20},
        ]
    }


def register_to_calendar(task_title: str, scheduled_time: str) -> dict:
    # TODO: Google Calendar APIに本接続する
    return {
        "success": True,
        "message": f"「{task_title}」を{scheduled_time}にカレンダー登録しました",
        "calendar_link": "https://calendar.google.com",
    }
