"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { AuthLayout } from "@/components/AuthLayout";
import { FieldError, fieldClass } from "@/components/FieldError";
import { signupErrors, type FieldErrors } from "@/lib/authErrors";

export default function SignUpPage() {
  const router = useRouter();
  const { signIn } = useAuthActions();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);

  return (
    <AuthLayout
      title="Start day one."
      subtitle="Takes thirty seconds. The streak starts tonight."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-accent hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const handle = username.trim().replace(/^@/, "");
          const next: FieldErrors = {};
          if (name.trim().length < 2) next.name = "Name needs at least 2 characters";
          if (!/^[a-zA-Z0-9_]{3,20}$/.test(handle)) {
            next.username = "3–20 letters, numbers, or underscores";
          }
          if (password.length < 8) next.password = "Password must be at least 8 characters";
          if (next.name || next.username || next.password) {
            setErrors(next);
            return;
          }
          setBusy(true);
          setErrors({});
          try {
            await signIn("password", {
              name: name.trim(),
              username: handle,
              email: handle,
              password,
              flow: "signUp",
            });
            router.push("/");
            router.refresh();
          } catch (err) {
            setErrors(signupErrors(err));
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
          <span className="text-xs font-medium uppercase tracking-wider text-chalk-faint">Name</span>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setErrors((cur) => ({ ...cur, name: undefined, form: undefined }));
            }}
            placeholder="Alex Mercer"
            autoComplete="name"
            className={fieldClass(errors.name)}
          />
          <FieldError message={errors.name} />
        </label>
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
            placeholder="alexm"
            autoComplete="username"
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
            placeholder="At least 8 characters"
            autoComplete="new-password"
            className={fieldClass(errors.password)}
          />
          <FieldError message={errors.password} />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-accent py-4 font-display text-base font-bold text-ink-950 transition-transform duration-150 ease-snap hover:brightness-110 active:scale-[0.99] disabled:opacity-70"
        >
          {busy ? "Creating…" : "Create account"}
        </button>
      </form>
    </AuthLayout>
  );
}
