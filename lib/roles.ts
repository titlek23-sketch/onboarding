import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "hire" | "hr";

export type Me = {
  email: string;
  name: string;
  isHire: boolean;
  isHr: boolean;
};

export const TABS: { href: string; label: string; role: Role }[] = [
  { href: "/todo", label: "내 할 일", role: "hire" },
  { href: "/search", label: "찾아보기", role: "hire" },
  { href: "/dashboard", label: "대시보드", role: "hr" },
];

// 로그인한 사람이 입사자 명단, HR 담당자 명단에 있는지 본다. 한 번 그릴 때 한 번만 묻는다.
export const getMe = cache(async (): Promise<Me | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;

  const email = user.email.toLowerCase();
  const [hire, hr] = await Promise.all([
    supabase.from("hires").select("name").eq("email", email).maybeSingle(),
    supabase.from("hr_staff").select("name").eq("email", email).maybeSingle(),
  ]);

  return {
    email,
    name: hire.data?.name ?? hr.data?.name ?? email,
    isHire: !!hire.data,
    isHr: !!hr.data,
  };
});

export function hasRole(me: Me, role: Role) {
  return role === "hire" ? me.isHire : me.isHr;
}

export function allowedTabs(me: Me) {
  return TABS.filter((tab) => hasRole(me, tab.role));
}

// 탭 화면 맨 처음에 부른다. 권한이 없으면 주소를 직접 입력해도 들어가지 못하고 첫 화면으로 돌아간다.
export async function requireRole(role: Role) {
  const me = await getMe();
  if (!me) redirect("/login");
  if (!hasRole(me, role)) redirect("/");
  return me;
}
