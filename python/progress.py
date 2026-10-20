"""PRD 7번 계산 규칙 (주간 리포트용).

대시보드(lib/onboarding.ts)와 똑같은 규칙이다. 한쪽을 고치면 다른 쪽도 고쳐야 한다.
- 대상 직군이 '전체'이거나 내 직군과 같은 할 일만 내 할 일
- 기한 = 입사일 + 기한 일수 (달력 그대로)
- 진행률 = 끝낸 필수 / 내 필수 전체, 필수가 없으면 0%
- 기한 지남 = 오늘 > 기한 이고 아직 체크 안 한 필수 할 일
- 선택 할 일은 모든 숫자에서 뺌
- 평균 진행률은 반올림 전 값으로 평균을 낸 뒤 한 번만 반올림
- 표는 진행률(정수)이 낮은 사람부터, 같으면 사번 순서
"""

import math
from datetime import date, datetime, timedelta, timezone

KST = timezone(timedelta(hours=9))


def today_kst():
    return datetime.now(KST).date()


def round_half_up(value):
    # 파이썬 round()는 0.5를 짝수 쪽으로 보내서(round(12.5) == 12) 대시보드와 달라진다
    return math.floor(value + 0.5)


def to_date(value):
    return value if isinstance(value, date) else date.fromisoformat(value)


def day_label(hire_date, today):
    d = (today - to_date(hire_date)).days
    return f"D+{d}" if d >= 0 else f"D-{-d}"


def my_tasks(hire, tasks):
    return [t for t in tasks if t["target_group"] in ("전체", hire["job_group"])]


def is_required(task):
    return task["required_type"] == "필수"


def due_date(hire, task):
    return to_date(hire["hire_date"]) + timedelta(days=task["due_days"])


def is_overdue(hire, task, done, today):
    return is_required(task) and not done and today > due_date(hire, task)


def progress_of(hire, tasks, done_ids, today):
    required = [t for t in my_tasks(hire, tasks) if is_required(t)]
    done = sum(1 for t in required if t["task_id"] in done_ids)
    ratio = 0 if not required else 100 * done / len(required)
    overdue = sum(1 for t in required if is_overdue(hire, t, t["task_id"] in done_ids, today))
    return {"ratio": ratio, "percent": round_half_up(ratio), "overdue": overdue}


def build_dashboard(hires, tasks, checks, today):
    done_by_email = {}
    for c in checks:
        done_by_email.setdefault(c["email"], set()).add(c["task_id"])

    overdue_count = {}
    rows = []
    ratio_sum = 0
    overdue_total = 0

    for hire in hires:
        done = done_by_email.get(hire["email"], set())
        p = progress_of(hire, tasks, done, today)
        ratio_sum += p["ratio"]
        overdue_total += p["overdue"]
        rows.append({
            "employee_no": hire["employee_no"],
            "name": hire["name"],
            "department": hire["department"],
            "job_group": hire["job_group"],
            "day_label": day_label(hire["hire_date"], today),
            "percent": p["percent"],
            "overdue": p["overdue"],
        })
        for t in my_tasks(hire, tasks):
            if is_overdue(hire, t, t["task_id"] in done, today):
                overdue_count[t["task_id"]] = overdue_count.get(t["task_id"], 0) + 1

    rows.sort(key=lambda r: (r["percent"], r["employee_no"]))

    top_overdue = sorted(
        (
            {"task_id": t["task_id"], "title": t["title"], "count": overdue_count[t["task_id"]]}
            for t in tasks
            if t["task_id"] in overdue_count
        ),
        key=lambda x: (-x["count"], x["task_id"]),
    )[:5]

    return {
        "hire_count": len(hires),
        "average_percent": None if not hires else round_half_up(ratio_sum / len(hires)),
        "overdue_total": overdue_total,
        "rows": rows,
        "top_overdue": top_overdue,
    }
