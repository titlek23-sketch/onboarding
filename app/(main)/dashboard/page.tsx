import { requireRole } from "@/lib/roles";

export default async function DashboardPage() {
  await requireRole("hr");

  return <h1 className="page-title">대시보드</h1>;
}
