import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// 서버(화면을 만드는 쪽)에서 쓰는 Supabase 연결. 로그인한 사람의 권한으로 읽는다.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // 화면을 그리는 도중에는 쿠키를 쓸 수 없다. 로그인 유지는 proxy.ts가 맡는다.
          }
        },
      },
    }
  );
}

type Client = Awaited<ReturnType<typeof createClient>>;

// 표 전체를 읽는다. Supabase는 한 번에 1000줄까지만 주므로 나눠서 읽는다.
export async function selectAll<T>(supabase: Client, table: string, columns: string, orderBy: string): Promise<T[]> {
  const page = 1000;
  const rows: T[] = [];
  for (let start = 0; ; start += page) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .order(orderBy)
      .range(start, start + page - 1);
    if (error) throw new Error(`${table} 표를 읽지 못했습니다: ${error.message}`);
    rows.push(...(data as T[]));
    if (data.length < page) return rows;
  }
}
