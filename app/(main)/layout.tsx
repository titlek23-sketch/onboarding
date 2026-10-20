import { redirect } from "next/navigation";
import { signOut } from "@/app/actions";
import { allowedTabs, getMe } from "@/lib/roles";
import Tabs from "./Tabs";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const me = await getMe();
  if (!me) redirect("/login");

  return (
    <>
      <header className="band">
        <div className="band-inner">
          <div className="band-top">
            <span className="brand">다온정밀 온보딩</span>
            <div className="who">
              <span className="who-name">{me.name}님</span>
              <form action={signOut}>
                <button type="submit" className="logout">
                  로그아웃
                </button>
              </form>
            </div>
          </div>
          <Tabs tabs={allowedTabs(me).map(({ href, label }) => ({ href, label }))} />
        </div>
      </header>
      <main className="page">{children}</main>
    </>
  );
}
