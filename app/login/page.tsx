import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <main>
      <div className="login-hero">
        <h1>다온정밀 온보딩</h1>
        <p>첫 출근을 환영합니다</p>
      </div>
      <div className="login-card">
        <div className="card">
          <LoginForm />
        </div>
        <p className="hint">처음이면 이메일과 비밀번호(6자 이상)를 정하고 회원가입을 누르세요.</p>
      </div>
    </main>
  );
}
