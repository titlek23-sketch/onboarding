import { redirect } from "next/navigation";
import { allowedTabs, getMe } from "@/lib/roles";

// 첫 화면: 볼 수 있는 첫 탭으로 보낸다.
export default async function Home() {
  const me = await getMe();
  if (!me) redirect("/login");

  const tabs = allowedTabs(me);
  if (tabs.length > 0) redirect(tabs[0].href);

  // 가입은 했지만 그 뒤 명단에서 빠진 경우
  return (
    <div className="card">
      <p style={{ margin: 0 }}>입사자 명단에 없는 이메일입니다. 경영지원팀에 문의하세요</p>
    </div>
  );
}
