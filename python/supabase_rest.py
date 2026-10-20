""".env의 키를 읽고 Supabase 표를 읽고 쓰는 도우미.

키 값은 절대 화면에 출력하지 않는다.
"""

from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
ENV_FILE = ROOT / ".env"
ENV_KEYS = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"]


def read_env():
    """.env를 읽어 {이름: 값}으로 돌려준다. 없는 줄은 빈 값."""
    values = {key: "" for key in ENV_KEYS}
    if ENV_FILE.exists():
        for line in ENV_FILE.read_text(encoding="utf-8-sig").splitlines():
            if "=" in line and not line.strip().startswith("#"):
                key, value = line.split("=", 1)
                values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def env_status():
    """[(이름, '들어 있음'/'비어 있음')] — 값은 돌려주지 않는다."""
    values = read_env()
    return [(key, "들어 있음" if values.get(key) else "비어 있음") for key in ENV_KEYS]


class SupabaseError(Exception):
    pass


class Supabase:
    """Secret key로 접속한다. 보기 권한 규칙(RLS)과 상관없이 모든 표를 읽고 쓴다."""

    def __init__(self):
        values = read_env()
        self.base = values["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/") + "/rest/v1"
        self.session = requests.Session()
        self.session.headers.update({
            "apikey": values["SUPABASE_SERVICE_ROLE_KEY"],
            "Content-Type": "application/json",
        })

    def _check(self, resp, table):
        if resp.status_code >= 300:
            raise SupabaseError(f"{table} 표: {resp.status_code} {resp.text[:300]}")

    def count(self, table):
        resp = self.session.head(
            f"{self.base}/{table}", params={"select": "*"}, headers={"Prefer": "count=exact"}, timeout=30
        )
        self._check(resp, table)
        return int(resp.headers["Content-Range"].split("/")[-1])

    def select(self, table, columns="*"):
        rows, start, page = [], 0, 1000
        while True:
            resp = self.session.get(
                f"{self.base}/{table}",
                params={"select": columns},
                headers={"Range": f"{start}-{start + page - 1}"},
                timeout=30,
            )
            self._check(resp, table)
            batch = resp.json()
            rows.extend(batch)
            if len(batch) < page:
                return rows
            start += page

    def upsert(self, table, rows, on_conflict):
        """같은 키가 있으면 고치고, 없으면 넣는다. 같은 내용을 다시 올려도 줄이 늘지 않는다."""
        if not rows:
            return
        resp = self.session.post(
            f"{self.base}/{table}",
            params={"on_conflict": on_conflict},
            headers={"Prefer": "resolution=merge-duplicates,return=minimal"},
            json=rows,
            timeout=60,
        )
        self._check(resp, table)

    def insert(self, table, rows):
        if not rows:
            return
        resp = self.session.post(
            f"{self.base}/{table}", headers={"Prefer": "return=minimal"}, json=rows, timeout=60
        )
        self._check(resp, table)
