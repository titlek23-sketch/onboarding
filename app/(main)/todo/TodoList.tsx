"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  PERIODS,
  dayLabel,
  dueDate,
  isDueToday,
  isOverdue,
  isRequired,
  myTasks,
  progressOf,
  type Hire,
  type TaskTemplate,
} from "@/lib/onboarding";

type Props = {
  hire: Hire;
  tasks: TaskTemplate[];
  initialDone: string[];
  today: string;
};

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function formatDue(date: string) {
  const d = new Date(`${date}T00:00:00Z`);
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 (${WEEKDAYS[d.getUTCDay()]})`;
}

export default function TodoList({ hire, tasks, initialDone, today }: Props) {
  const [done, setDone] = useState(() => new Set(initialDone));
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");

  const mine = myTasks(hire, tasks);
  const progress = progressOf(hire, tasks, done, today);

  async function toggle(taskId: string) {
    const wasDone = done.has(taskId);
    const flip = (wantDone: boolean) =>
      setDone((current) => {
        const next = new Set(current);
        if (wantDone) next.add(taskId);
        else next.delete(taskId);
        return next;
      });
    flip(!wasDone);
    setSaving(taskId);
    setError("");

    const supabase = createClient();
    const { error } = wasDone
      ? await supabase.from("task_checks").delete().eq("email", hire.email).eq("task_id", taskId)
      : await supabase.from("task_checks").insert({ email: hire.email, task_id: taskId });

    if (error) {
      flip(wasDone); // 저장에 실패하면 되돌린다
      setError("저장하지 못했습니다. 잠시 뒤 다시 눌러 주세요.");
    }
    setSaving(null);
  }

  return (
    <>
      <section className="card summary">
        <div className="summary-top">
          <h1 className="summary-name">{hire.name}님</h1>
          <span className="dday">{dayLabel(hire.hire_date, today)}</span>
        </div>
        <div className="progress-row">
          <div
            className="progress"
            role="progressbar"
            aria-valuenow={progress.percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="진행률"
          >
            <div className="progress-fill" style={{ width: `${progress.percent}%` }} />
          </div>
          <span className="progress-num">{progress.percent}%</span>
        </div>
        {progress.overdue > 0 && <p className="summary-overdue">기한 지난 필수 할 일 {progress.overdue}개</p>}
      </section>

      {error && (
        <p className="notice notice-error" role="alert">
          {error}
        </p>
      )}

      {PERIODS.map((period) => {
        const group = mine.filter((t) => t.period === period);
        if (group.length === 0) return null;
        return (
          <section key={period} className="group">
            <h2 className="group-title">{period}</h2>
            <ul className="task-list">
              {group.map((task) => {
                const checked = done.has(task.task_id);
                const due = dueDate(hire, task);
                const overdue = isOverdue(hire, task, checked, today);
                const dueToday = isDueToday(hire, task, today);
                const state = overdue ? " overdue" : dueToday ? " due-today" : "";
                const department = task.department === "소속 부서" ? hire.department : task.department;
                return (
                  <li key={task.task_id} className={`task${checked ? " done" : ""}${state}`}>
                    <label className="task-label">
                      <input
                        type="checkbox"
                        className="task-check"
                        checked={checked}
                        disabled={saving === task.task_id}
                        onChange={() => toggle(task.task_id)}
                      />
                      <span className="task-body">
                        <span className="task-title">
                          {task.title}
                          {!isRequired(task) && <span className="tag">선택</span>}
                        </span>
                        <span className="task-meta">
                          <span className="task-due">
                            {formatDue(due)}
                            {overdue && " · 기한 지남"}
                            {dueToday && " · 오늘 기한"}
                          </span>
                          <span>{department}</span>
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </>
  );
}
