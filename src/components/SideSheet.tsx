import { useEffect, useRef, type ReactNode } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/**
 * Right-hand overlay panel. The content stays mounted while closed (just slid
 * off-screen and made inert), so panels with live state — e.g. a running price
 * refresh in the flight panel — keep going when the sheet is dismissed.
 */
export default function SideSheet({ open, onClose, title, children }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  // React 18 doesn't know the `inert` prop; set it directly so the hidden
  // panel's controls drop out of the tab order and the accessibility tree.
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    if (open) el.removeAttribute('inert');
    else el.setAttribute('inert', '');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <>
      <div
        aria-hidden
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal={open}
        aria-label={title}
        tabIndex={-1}
        className={`fixed inset-y-0 right-0 z-40 flex w-[400px] max-w-[92vw] flex-col bg-zinc-50 shadow-2xl outline-none transition-[transform,visibility] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none dark:bg-zinc-950 ${
          open ? 'visible translate-x-0' : 'invisible translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <h2 className="text-sm font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="rounded-md px-2 py-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 space-y-6 overflow-y-auto overscroll-contain p-4">
          {children}
        </div>
      </div>
    </>
  );
}

/** Header button that opens the side sheet. */
export function MenuButton({
  open,
  onClick,
  label,
}: {
  open: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-label={label}
      title={label}
      className="flex h-9 items-center gap-2 rounded-lg border border-zinc-300 px-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
        <path
          d="M4 7h16M4 12h16M4 17h16"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
