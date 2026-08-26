"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { AuthLayout } from "@/components/AuthLayout";
import { FieldError, fieldClass } from "@/components/FieldError";
import { loginErrors, type FieldErrors } from "@/lib/authErrors";

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuthActions();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);

  return (
    <AuthLayout
      title="Back at it."
      subtitle="Log in and keep the chain alive."
      footer={
        <>
          No account?{" "}
          <Link href="/signup" className="font-semibold text-accent hover:underline">
            Sign up
          </Link>
        </>
      }
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const next: FieldErrors = {};
          if (!username.trim()) next.username = "Enter your username";
          if (!password) next.password = "Enter your password";
          if (next.username || next.password) {
            setErrors(next);
            return;
          }
          setBusy(true);
          setErrors({});
          try {
            const handle = username.trim().replace(/^@/, "");
            await signIn("password", {
              email: handle,
              username: handle,
              password,
              flow: "signIn",
            });
            router.replace("/");
          } catch (err) {
            setErrors(loginErrors(err));
          } finally {
            setBusy(false);
          }
        }}
        className="space-y-3"
      >
        {errors.form && (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {errors.form}
          </p>
        )}
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wider text-chalk-faint">
            Username
          </span>
          <input
            value={username}
            onChange={(e) => {
              setUsername(e.target.value.replace(/\s/g, ""));
              setErrors((cur) => ({ ...cur, username: undefined, form: undefined }));
            }}
            autoComplete="username"
            placeholder="alexm"
            className={fieldClass(errors.username)}
          />
          <FieldError message={errors.username} />
        </label>
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wider text-chalk-faint">
            Password
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setErrors((cur) => ({ ...cur, password: undefined, form: undefined }));
            }}
            autoComplete="current-password"
            className={fieldClass(errors.password)}
          />
          <FieldError message={errors.password} />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-accent py-4 font-display text-base font-bold text-ink-950 transition-transform duration-150 ease-snap hover:brightness-110 active:scale-[0.99] disabled:opacity-70"
        >
          {busy ? "Logging in…" : "Log in"}
        </button>
      </form>
    </AuthLayout>
  );
}
