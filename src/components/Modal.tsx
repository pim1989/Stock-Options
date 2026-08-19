import type { ReactNode } from "react";

export function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-start md:items-center justify-center p-4 z-50 overflow-y-auto">
      <div className={`card w-full ${wide ? "max-w-2xl" : "max-w-md"} p-5 my-8`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">{title}</h2>
          <button
            onClick={onClose}
            className="text-[var(--color-muted)] hover:text-[var(--color-ink)] text-xl leading-none"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm mb-3">
      <span className="block text-xs font-medium text-[var(--color-muted)] mb-1">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "w-full border border-[var(--color-border)] rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]";
