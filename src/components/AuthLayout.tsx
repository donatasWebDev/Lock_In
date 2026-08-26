"use client";

import { motion } from "framer-motion";
import { FlameIcon } from "lucide-react";
import type { ReactNode } from "react";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="flex min-h-full w-full items-center justify-center bg-ink-950 px-5 py-12 font-sans text-chalk">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
        className="w-full max-w-sm"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
          <FlameIcon className="h-5 w-5" aria-hidden="true" />
        </span>
        <h1 className="mt-6 font-display text-3xl font-extrabold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-chalk-muted">{subtitle}</p>
        <div className="mt-8">{children}</div>
        <div className="mt-6 text-center text-sm text-chalk-muted">{footer}</div>
      </motion.div>
    </div>
  );
}
