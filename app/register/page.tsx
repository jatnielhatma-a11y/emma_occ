import { AuthForm } from "@/components/auth/AuthForm";

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-occ-ink px-4">
      <AuthForm mode="register" />
    </main>
  );
}
