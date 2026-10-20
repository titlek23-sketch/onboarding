import { requireRole } from "@/lib/roles";
import { createClient, selectAll } from "@/lib/supabase/server";
import { buildDashboard, todayKst, type Check, type Hire, type TaskTemplate } from "@/lib/onboarding";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await requireRole("hr");
  const supabase = await createClient();

  const [hires, tasks, checks] = await Promise.all([
    selectAll<Hire>(supabase, "hires", "employee_no, name, email, department, job_group, hire_date", "employee_no"),
    selectAll<TaskTemplate>(supabase, "task_templates", "*", "task_id"),
    selectAll<Check>(supabase, "task_checks", "email, task_id", "email"),
  ]);

  const today = todayKst();
  const d = buildDashboard(hires, tasks, checks, today);

  return (
    <>
      <div className="dash-head">
        <h1 className="page-title">대시보드</h1>
        <span className="muted dash-date">기준일 {today}</span>
      </div>

      <section className="stats">
        <div className="stat card">
          <span className="stat-label">입사자 수</span>
          <span className="stat-value">{d.hireCount}명</span>
        </div>
        <div className="stat card">
          <span className="stat-label">평균 진행률</span>
          <span className="stat-value">{d.averagePercent === null ? "-" : `${d.averagePercent}%`}</span>
        </div>
        <div className="stat card">
          <span className="stat-label">기한 지난 할 일</span>
          <span className={d.overdueTotal > 0 ? "stat-value red" : "stat-value"}>{d.overdueTotal}개</span>
        </div>
      </section>

      <section className="card table-card">
        <h2 className="section-title">입사자별 진행률</h2>
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>이름</th>
                <th>부서</th>
                <th>직군</th>
                <th>입사 며칠째</th>
                <th className="num">진행률</th>
                <th className="num">기한 지난 수</th>
              </tr>
            </thead>
            <tbody>
              {d.rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="none">
                    없음
                  </td>
                </tr>
              ) : (
                d.rows.map((r) => (
                  <tr key={r.employeeNo}>
                    <td className="strong">{r.name}</td>
                    <td>{r.department}</td>
                    <td>{r.jobGroup}</td>
                    <td>{r.dayLabel}</td>
                    <td className="num">{r.percent}%</td>
                    <td className={r.overdue > 0 ? "num red" : "num"}>{r.overdue}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card table-card">
        <h2 className="section-title">가장 많이 밀린 할 일</h2>
        <table className="table">
          <thead>
            <tr>
              <th>할 일 이름</th>
              <th className="num">밀린 사람 수</th>
            </tr>
          </thead>
          <tbody>
            {d.topOverdue.length === 0 ? (
              <tr>
                <td colSpan={2} className="none">
                  없음
                </td>
              </tr>
            ) : (
              d.topOverdue.map((t) => (
                <tr key={t.taskId}>
                  <td>{t.title}</td>
                  <td className="num red">{t.count}명</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </>
  );
}
