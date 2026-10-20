"""원천데이터 엑셀 3개를 점검만 하고 결과를 보여 준다. 아무것도 올리지 않는다.

실행: .venv\\Scripts\\python python\\check_excel.py
"""

import sys
from collections import Counter

from excel_data import load_and_check

sys.stdout.reconfigure(encoding="utf-8")


def main():
    data = load_and_check()

    print("■ 읽은 줄 수 (제목 줄 제외)")
    required = sum(1 for t in data.tasks if t["필수 여부"] == "필수")
    optional = sum(1 for t in data.tasks if t["필수 여부"] == "선택")
    print(f"  FAQ            {len(data.faq)}")
    print(f"  할일           {len(data.tasks)} (필수 {required}, 선택 {optional})")
    print(f"  입사자         {len(data.hires)}")
    print(f"  HR담당자       {len(data.hr)}")
    print(f"  체크기록_샘플  {len(data.checks)}")

    print()
    print("■ FAQ 분류")
    for name, count in Counter(f["분류"] for f in data.faq).items():
        print(f"  {name}: {count}")

    print()
    if data.problems:
        print(f"■ 점검 결과: 문제 {len(data.problems)}건")
        for p in data.problems:
            print(f"  - {p}")
        return 1
    print("■ 점검 결과: 문제 없음")
    return 0


if __name__ == "__main__":
    sys.exit(main())
