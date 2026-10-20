"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const NOT_LISTED = "입사자 명단에 없는 이메일입니다. 경영지원팀에 문의하세요";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(action: (email: string) => Promise<string | null>) {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !password) {
      setMessage("이메일과 비밀번호를 입력하세요.");
      return;
    }
    setBusy(true);
    setMessage("");
    const error = await action(trimmed);
    if (error) {
      setMessage(error);
      setBusy(false);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  async function logIn(trimmed: string) {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: trimmed, password });
    if (!error) return null;
    if (error.message.includes("Invalid login credentials")) {
      return "이메일 또는 비밀번호가 맞지 않습니다. 처음이면 회원가입을 눌러 주세요.";
    }
    return "로그인하지 못했습니다. 잠시 뒤 다시 해 보세요.";
  }

  async function signUp(trimmed: string) {
    if (password.length < 6) return "비밀번호는 6자 이상으로 정해 주세요.";

    const supabase = createClient();
    const { data: allowed, error: checkError } = await supabase.rpc("is_signup_allowed", { p_email: trimmed });
    if (checkError) return "명단을 확인하지 못했습니다. 잠시 뒤 다시 해 보세요.";
    if (!allowed) return NOT_LISTED;

    const { data, error } = await supabase.auth.signUp({ email: trimmed, password });
    if (error) {
      if (error.message.includes("Database error")) return NOT_LISTED;
      if (error.message.toLowerCase().includes("already registered")) {
        return "이미 가입된 이메일입니다. 로그인을 눌러 주세요.";
      }
      if (error.message.toLowerCase().includes("password")) return "비밀번호를 더 길고 어렵게 정해 주세요.";
      return "가입하지 못했습니다. 잠시 뒤 다시 해 보세요.";
    }
    if (!data.session) {
      return "가입은 되었지만 바로 로그인되지 않았습니다. 경영지원팀에 문의하세요.";
    }
    return null;
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        run(logIn);
      }}
    >
      {message && (
        <p className="notice notice-error" role="alert">
          {message}
        </p>
      )}
      <label className="field">
        <span>이메일</span>
        <input
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@daon.example"
        />
      </label>
      <label className="field">
        <span>비밀번호</span>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <button type="submit" className="btn btn-primary" disabled={busy}>
        로그인
      </button>
      <button type="button" className="btn btn-outline" disabled={busy} onClick={() => run(signUp)}>
        회원가입
      </button>
    </form>
  );
}
