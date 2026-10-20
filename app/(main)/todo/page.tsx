import { requireRole } from "@/lib/roles";
import { createClient, selectAll } from "@/lib/supabase/server";
import { todayKst, type Hire, type TaskTemplate } from "@/lib/onboarding";
import TodoList from "./TodoList";

export const dynamic = "force-dynamic";

export default async function TodoPage() {
  const me = await requireRole("hire");
  const supabase = await createClient();

  const [{ data: hire }, tasks, { data: checks }] = await Promise.all([
    supabase
      .from("hires")
      .select("employee_no, name, email, department, job_group, hire_date")
      .eq("email", me.email)
      .single<Hire>(),
    selectAll<TaskTemplate>(supabase, "task_templates", "*", "task_id"),
    supabase.from("task_checks").select("task_id").eq("email", me.email),
  ]);

  if (!hire) {
    return <p className="card">입사자 정보를 읽지 못했습니다. 경영지원팀에 문의하세요</p>;
  }

  return (
    <TodoList
      hire={hire}
      tasks={tasks}
      initialDone={(checks ?? []).map((c) => c.task_id)}
      today={todayKst()}
    />
  );
}
