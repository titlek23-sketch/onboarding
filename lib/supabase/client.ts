import { createBrowserClient } from "@supabase/ssr";

// 브라우저에서 쓰는 Supabase 연결. 앱은 NEXT_PUBLIC 두 값만 쓴다.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
