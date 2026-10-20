import { requireRole } from "@/lib/roles";

export default async function SearchPage() {
  await requireRole("hire");

  return <h1 className="page-title">찾아보기</h1>;
}
