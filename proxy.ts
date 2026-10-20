import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// 모든 화면 요청 앞에서 로그인 상태를 새로 고치고,
// 로그인 안 했으면 로그인 화면으로, 로그인했으면 로그인 화면 대신 첫 화면으로 보낸다.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers ?? {}).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    }
  );

  const { data } = await supabase.auth.getClaims();
  const loggedIn = !!data?.claims;
  const onLogin = request.nextUrl.pathname === "/login";

  if (!loggedIn && !onLogin) {
    return redirectKeepingCookies(request, response, "/login");
  }
  if (loggedIn && onLogin) {
    return redirectKeepingCookies(request, response, "/");
  }
  return response;
}

function redirectKeepingCookies(request: NextRequest, response: NextResponse, path: string) {
  const redirect = NextResponse.redirect(new URL(path, request.url));
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
