// PRD 7번 계산 규칙. [내 할 일]과 [대시보드]가 함께 쓴다.
// 파이썬 주간 리포트(python/progress.py)도 똑같은 규칙으로 계산한다. 한쪽을 고치면 다른 쪽도 고쳐야 한다.

export type Hire = {
  employee_no: string;
  name: string;
  email: string;
  department: string;
  job_group: string;
  hire_date: string; // YYYY-MM-DD
};

export type TaskTemplate = {
  task_id: string;
  period: string;
  due_days: number;
  title: string;
  description: string;
  department: string;
  required_type: string; // 필수 / 선택
  target_group: string; // 전체 / 현장직 / 사무직
};

export type Check = { email: string; task_id: string };

export const PERIODS = ["입사 전", "첫날", "첫 주", "첫 달"];

const DAY_MS = 24 * 60 * 60 * 1000;

// 오늘 날짜 (한국 시간) — YYYY-MM-DD
export function todayKst(now: Date = new Date()) {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function toDay(date: string) {
  return Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)));
}

export function addDays(date: string, days: number) {
  return new Date(toDay(date) + days * DAY_MS).toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string) {
  return Math.round((toDay(to) - toDay(from)) / DAY_MS);
}

// 입사 며칠째: 당일 D+0, 3일 전 D-3
export function dayLabel(hireDate: string, today: string) {
  const d = daysBetween(hireDate, today);
  return d >= 0 ? `D+${d}` : `D-${-d}`;
}

export function isRequired(task: TaskTemplate) {
  return task.required_type === "필수";
}

// 7-1. 대상 직군이 '전체'이거나 내 직군과 같은 할 일
export function myTasks(hire: Hire, tasks: TaskTemplate[]) {
  return tasks.filter((t) => t.target_group === "전체" || t.target_group === hire.job_group);
}

// 7-2. 기한 날짜 = 입사일 + 기한 일수 (달력 그대로)
export function dueDate(hire: Hire, task: TaskTemplate) {
  return addDays(hire.hire_date, task.due_days);
}

// 7-4. 기한 지남: 오늘이 기한보다 늦은데 아직 체크하지 않은 필수 할 일
export function isOverdue(hire: Hire, task: TaskTemplate, done: boolean, today: string) {
  return isRequired(task) && !done && today > dueDate(hire, task);
}

// 7-4. 오늘 기한: 오늘이 바로 기한인 필수 할 일
export function isDueToday(hire: Hire, task: TaskTemplate, today: string) {
  return isRequired(task) && today === dueDate(hire, task);
}

// 반올림 (0.5는 올림). 파이썬 round()는 0.5를 짝수 쪽으로 보내서 쓰지 않는다.
export function roundHalfUp(value: number) {
  return Math.floor(value + 0.5);
}

export type Progress = {
  ratio: number; // 반올림 전 퍼센트 (0~100)
  percent: number; // 화면에 보이는 정수 퍼센트
  overdue: number; // 기한 지난 필수 할 일 수
};

// 7-3. 진행률 = 끝낸 필수 할 일 / 내 필수 할 일 전체. 필수가 없으면 0%.
export function progressOf(hire: Hire, tasks: TaskTemplate[], doneIds: Set<string>, today: string): Progress {
  const required = myTasks(hire, tasks).filter(isRequired);
  const done = required.filter((t) => doneIds.has(t.task_id)).length;
  const ratio = required.length === 0 ? 0 : (100 * done) / required.length;
  const overdue = required.filter((t) => isOverdue(hire, t, doneIds.has(t.task_id), today)).length;
  return { ratio, percent: roundHalfUp(ratio), overdue };
}

export type HireRow = {
  employeeNo: string;
  name: string;
  department: string;
  jobGroup: string;
  dayLabel: string;
  percent: number;
  overdue: number;
};

export type Dashboard = {
  hireCount: number;
  averagePercent: number | null; // 입사자가 없으면 null → '-'
  overdueTotal: number;
  rows: HireRow[];
  topOverdue: { taskId: string; title: string; count: number }[];
};

// 7-5 ~ 7-7. 대시보드 숫자
export function buildDashboard(hires: Hire[], tasks: TaskTemplate[], checks: Check[], today: string): Dashboard {
  const doneByEmail = new Map<string, Set<string>>();
  for (const c of checks) {
    if (!doneByEmail.has(c.email)) doneByEmail.set(c.email, new Set());
    doneByEmail.get(c.email)!.add(c.task_id);
  }

  const overdueCount = new Map<string, number>();
  const rows: HireRow[] = [];
  let ratioSum = 0;
  let overdueTotal = 0;

  for (const hire of hires) {
    const done = doneByEmail.get(hire.email) ?? new Set<string>();
    const p = progressOf(hire, tasks, done, today);
    ratioSum += p.ratio;
    overdueTotal += p.overdue;
    rows.push({
      employeeNo: hire.employee_no,
      name: hire.name,
      department: hire.department,
      jobGroup: hire.job_group,
      dayLabel: dayLabel(hire.hire_date, today),
      percent: p.percent,
      overdue: p.overdue,
    });
    for (const t of myTasks(hire, tasks)) {
      if (isOverdue(hire, t, done.has(t.task_id), today)) {
        overdueCount.set(t.task_id, (overdueCount.get(t.task_id) ?? 0) + 1);
      }
    }
  }

  // 진행률(화면에 보이는 정수)이 낮은 사람부터, 같으면 사번 순서
  rows.sort((a, b) => a.percent - b.percent || compare(a.employeeNo, b.employeeNo));

  // 밀린 사람이 많은 할 일부터, 같으면 할일ID 순서, 최대 5개
  const topOverdue = tasks
    .filter((t) => overdueCount.has(t.task_id))
    .map((t) => ({ taskId: t.task_id, title: t.title, count: overdueCount.get(t.task_id)! }))
    .sort((a, b) => b.count - a.count || compare(a.taskId, b.taskId))
    .slice(0, 5);

  return {
    hireCount: hires.length,
    averagePercent: hires.length === 0 ? null : roundHalfUp(ratioSum / hires.length),
    overdueTotal,
    rows,
    topOverdue,
  };
}

// 글자 순서 비교 (파이썬의 문자열 비교와 같은 결과)
function compare(a: string, b: string) {
  return a < b ? -1 : a > b ? 1 : 0;
}
