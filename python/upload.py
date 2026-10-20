"""원천데이터 엑셀을 점검한 뒤 Supabase에 올린다.

- 점검에서 문제가 하나라도 있으면 아무것도 올리지 않는다.
- FAQ, 할 일 템플릿, 입사자, HR 담당자 표는 엑셀 내용으로 맞춘다. (같은 키는 고치고, 새 키는 넣음)
- 체크 기록은 지우지 않는다. 체크기록_샘플은 체크 기록 표가 비어 있을 때 한 번만 올린다.
- 엑셀에서 없어진 줄은 처리하지 않는다. (범위 밖)

실행: .venv\\Scripts\\python python\\upload.py
"""

import sys
from datetime import timedelta, timezone

from excel_data import load_and_check
from supabase_rest import Supabase, SupabaseError, env_status

sys.stdout.reconfigure(encoding="utf-8")

KST = timezone(timedelta(hours=9))


def faq_rows(data):
    return [
        {
            "faq_id": r["번호"],
            "category": r["분류"],
            "question": r["질문"],
            "aliases": r["이런 말로도 찾음"],
            "short_answer": r["한 줄 답변"],
            "detail": r["상세 설명"],
            "related_form": r["관련 서식"] or None,
            "department": r["담당 부서"],
            "last_checked": r["최종 확인일"].isoformat(),
        }
        for r in data.faq
    ]


def task_rows(data):
    return [
        {
            "task_id": r["할일ID"],
            "period": r["시기"],
            "due_days": r["기한(입사일 기준 일수)"],
            "title": r["할 일"],
            "description": r["설명"],
            "department": r["담당 부서"],
            "required_type": r["필수 여부"],
            "target_group": r["대상 직군"],
        }
        for r in data.tasks
    ]


def hire_rows(data):
    return [
        {
            "employee_no": r["사번"],
            "name": r["이름"],
            "email": r["이메일"],
            "department": r["부서"],
            "job_group": r["직군"],
            "site": r["사업장"] or None,
            "hire_date": r["입사일"].isoformat(),
            "mentor": r["멘토"] or None,
        }
        for r in data.hires
    ]


def hr_rows(data):
    return [{"email": r["이메일"], "name": r["이름"], "role": r["역할"]} for r in data.hr]


def check_rows(data):
    # 엑셀의 완료 일시는 한국 시간으로 본다
    return [
        {
            "email": r["이메일"],
            "task_id": r["할일ID"],
            "completed_at": r["완료 일시"].replace(tzinfo=KST).isoformat(),
        }
        for r in data.checks
    ]


TABLES = [
    # (표, Supabase 표 이름, 기준 키, 엑셀 → 줄 변환)
    ("FAQ", "faq", "faq_id", faq_rows),
    ("할 일 템플릿", "task_templates", "task_id", task_rows),
    ("입사자", "hires", "employee_no", hire_rows),
    ("HR 담당자", "hr_staff", "email", hr_rows),
]


def main():
    print("■ .env")
    status = env_status()
    for key, state in status:
        print(f"  {key}: {state}")
    if any(state == "비어 있음" for _, state in status):
        print("\n.env에 비어 있는 줄이 있어서 멈춥니다.")
        return 1

    print("\n■ 엑셀 점검")
    data = load_and_check()
    if data.problems:
        print(f"  문제 {len(data.problems)}건 — 아무것도 올리지 않습니다.")
        for p in data.problems:
            print(f"  - {p}")
        return 1
    print("  문제 없음")

    db = Supabase()
    try:
        print("\n■ 올리기")
        for label, table, key, make_rows in TABLES:
            rows = make_rows(data)
            db.upsert(table, rows, on_conflict=key)
            print(f"  {label}: {len(rows)}줄 맞춤")

        if db.count("task_checks") == 0:
            rows = check_rows(data)
            db.insert("task_checks", rows)
            print(f"  체크 기록: 표가 비어 있어서 샘플 {len(rows)}줄을 처음 올림")
        else:
            print("  체크 기록: 이미 기록이 있어서 건드리지 않음")

        print("\n■ 건수 비교")
        print(f"  {'표':<12}{'엑셀':>6}{'Supabase':>10}")
        all_match = True
        for label, table, excel_count in [
            ("FAQ", "faq", len(data.faq)),
            ("할 일 템플릿", "task_templates", len(data.tasks)),
            ("입사자", "hires", len(data.hires)),
            ("HR 담당자", "hr_staff", len(data.hr)),
            ("체크 기록", "task_checks", len(data.checks)),
        ]:
            db_count = db.count(table)
            mark = "일치" if db_count == excel_count else "다름"
            all_match &= db_count == excel_count
            print(f"  {label:<12}{excel_count:>6}{db_count:>10}  {mark}")
        if not all_match:
            print("\n  ※ 체크 기록은 앱에서 체크하면 늘어나므로, 앱을 쓰기 시작한 뒤에는 엑셀과 다른 것이 정상입니다.")
    except SupabaseError as e:
        print(f"\nSupabase 오류: {e}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
