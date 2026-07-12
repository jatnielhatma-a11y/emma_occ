"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthFormProps = {
  mode: "login" | "register";
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    if (mode === "login") {
      const demoResponse = await fetch("/api/demo-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });

      if (demoResponse.ok) {
        router.push("/demo");
        router.refresh();
        return;
      }
    }

    const result =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                display_name: displayName
              }
            }
          });

    setIsSubmitting(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="nova-surface w-full max-w-md space-y-4 rounded-lg border border-occ-line p-6 shadow-nova">
      <div>
        <Image src="/brand/emma-occ-badge.png" alt="NOVA badge" width={76} height={76} className="mb-4 h-16 w-16 rounded-full border border-occ-gold/50 bg-white object-cover shadow-nova" />
        <p className="text-sm uppercase tracking-[0.18em] text-occ-gold">NOVA</p>
        <h1 className="mt-2 text-2xl font-semibold text-white">
          {mode === "login" ? "Sign in to operations" : "Create your operations account"}
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Family focused mission control with secure roster, calendar, commute, and alert intelligence.
        </p>
      </div>

      {mode === "register" ? (
        <label className="block text-sm text-zinc-300">
          Display name
          <input
            className="focus-ring mt-2 w-full rounded-md border border-occ-line bg-occ-ink px-3 py-2 text-white"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            autoComplete="name"
          />
        </label>
      ) : null}

      <label className="block text-sm text-zinc-300">
        Email
        <input
          className="focus-ring mt-2 w-full rounded-md border border-occ-line bg-occ-ink px-3 py-2 text-white"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
        />
      </label>

      <label className="block text-sm text-zinc-300">
        Password
        <input
          className="focus-ring mt-2 w-full rounded-md border border-occ-line bg-occ-ink px-3 py-2 text-white"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          minLength={8}
          required
        />
      </label>

      {error ? (
        <div className="rounded-md border border-occ-red/50 bg-occ-red/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="focus-ring w-full rounded-md bg-occ-cyan px-4 py-2 font-semibold text-occ-ink shadow-nova disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Working..." : mode === "login" ? "Sign in" : "Create account"}
      </button>

      <p className="text-center text-sm text-zinc-400">
        {mode === "login" ? "New to NOVA?" : "Already registered?"}{" "}
        <Link className="text-occ-cyan hover:text-white" href={mode === "login" ? "/register" : "/login"}>
          {mode === "login" ? "Create an account" : "Sign in"}
        </Link>
      </p>

      <p className="text-center text-sm text-zinc-400">
        Want to look around first?{" "}
        <Link className="text-occ-cyan hover:text-white" href="/demo">
          View demo
        </Link>
      </p>
    </form>
  );
}
