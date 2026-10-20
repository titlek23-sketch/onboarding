"use client";

import { useMemo, useState } from "react";

export type Faq = {
  faq_id: string;
  category: string;
  question: string;
  aliases: string;
  short_answer: string;
  detail: string;
  department: string;
};

// FAQ 엑셀의 분류 9가지 (엑셀에 적힌 순서)
const CATEGORIES = [
  "입사·적응",
  "근태·휴가",
  "급여·경비",
  "안전·보건",
  "교육·자격",
  "출입·보안",
  "복지·생활",
  "사업장·조직",
  "전산·계정",
];
const ALL = "전체";

// 띄어쓰기를 무시하고, 영어 대소문자도 구분하지 않는다
function normalize(text: string) {
  return text.replace(/\s+/g, "").toLowerCase();
}

export default function FaqSearch({ faqs }: { faqs: Faq[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(ALL);
  const [openId, setOpenId] = useState<string | null>(null);

  // 질문, 이런 말로도 찾음, 한 줄 답변 세 곳만 찾는다
  const index = useMemo(
    () => faqs.map((f) => ({ faq: f, haystack: normalize(`${f.question}\n${f.aliases}\n${f.short_answer}`) })),
    [faqs]
  );

  const needle = normalize(query);
  const results = index
    .filter(({ faq }) => category === ALL || faq.category === category)
    .filter(({ haystack }) => needle === "" || haystack.includes(needle))
    .map(({ faq }) => faq);

  return (
    <>
      <h1 className="page-title">찾아보기</h1>

      <input
        type="search"
        className="search-input"
        placeholder="궁금한 것을 입력하세요 (예: 연차신청)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="FAQ 검색"
      />

      <div className="chips" role="group" aria-label="분류">
        {[ALL, ...CATEGORIES].map((c) => (
          <button
            key={c}
            type="button"
            className={c === category ? "chip active" : "chip"}
            aria-pressed={c === category}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>

      <p className="result-count muted">{results.length}건</p>

      {results.length === 0 ? (
        <p className="card empty">찾는 내용이 없습니다. 경영지원팀(내선 2101)에 문의하세요</p>
      ) : (
        <ul className="faq-list">
          {results.map((f) => {
            const open = openId === f.faq_id;
            return (
              <li key={f.faq_id} className={open ? "faq open" : "faq"}>
                <button
                  type="button"
                  className="faq-head"
                  aria-expanded={open}
                  onClick={() => setOpenId(open ? null : f.faq_id)}
                >
                  <span className="faq-q">{f.question}</span>
                  <span className="faq-a">{f.short_answer}</span>
                  <span className="faq-dept">{f.department}</span>
                  <span className="faq-arrow" aria-hidden>
                    ▾
                  </span>
                </button>
                {open && <p className="faq-detail">{f.detail}</p>}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
