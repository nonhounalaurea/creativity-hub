import LoginForm from "./LoginForm";

export const metadata = { title: "accedi" };

export default function LoginPage() {
  return (
    <div className="mx-auto mt-12 w-full max-w-sm md:mt-24">
      <h1 className="text-xl font-semibold tracking-tight">accedi</h1>
      <p className="mt-1 text-sm text-muted">solo per utenti autorizzati</p>
      <LoginForm />
    </div>
  );
}
