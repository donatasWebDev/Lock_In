"use client";

import { AnimatePresence, motion } from "framer-motion";
import { XIcon } from "lucide-react";

export function Toast({
  message,
  onClose,
}: {
  message: string | null;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          role="alert"
          className="fixed inset-x-4 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-50 mx-auto max-w-md rounded-xl border border-ink-700 bg-ink-850 px-4 py-3 shadow-lift md:bottom-6"
        >
          <div className="flex items-start gap-3">
            <p className="min-w-0 flex-1 text-sm leading-snug text-chalk">{message}</p>
            <button
              type="button"
              onClick={onClose}
              aria-label="Dismiss"
              className="rounded-md p-0.5 text-chalk-faint hover:text-chalk"
            >
              <XIcon className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
