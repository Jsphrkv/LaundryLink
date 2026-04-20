import React from "react";
import clsx from "clsx";
import { Loader2 } from "lucide-react";

// ─── Button ───────────────────────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  leftIcon,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]";

  const variants = {
    primary:
      "bg-primary text-white hover:bg-primary-700 focus:ring-primary-600 shadow-sm",
    secondary: "bg-secondary text-white hover:opacity-90 focus:ring-secondary",
    outline:
      "border-2 border-primary text-primary hover:bg-primary-50 focus:ring-primary-600",
    ghost:
      "bg-primary-50 text-primary hover:bg-primary-100 focus:ring-primary-600",
    danger: "bg-danger text-white hover:opacity-90 focus:ring-danger",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2.5 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <button
      disabled={disabled || loading}
      className={clsx(
        base,
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : leftIcon}
      {children}
    </button>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export function Input({
  label,
  error,
  hint,
  leftIcon,
  rightElement,
  className,
  ...props
}: InputProps) {
  return (
    <div className="mb-4">
      {label && (
        <label className="block text-sm font-semibold text-gray-600 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute left-3 text-gray-400 pointer-events-none">
            {leftIcon}
          </div>
        )}
        <input
          className={clsx(
            "w-full rounded-xl border-2 bg-gray-50 py-2.5 text-sm text-gray-900 placeholder-gray-400",
            "focus:outline-none focus:ring-0 focus:bg-white transition-colors",
            leftIcon ? "pl-10 pr-4" : "px-4",
            rightElement && "pr-10",
            error
              ? "border-red-400 focus:border-red-500"
              : "border-gray-200 focus:border-primary",
            className,
          )}
          {...props}
        />
        {rightElement && <div className="absolute right-3">{rightElement}</div>}
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      {hint && !error && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

// ─── Textarea ─────────────────────────────────────────────────────────────────
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className, ...props }: TextareaProps) {
  return (
    <div className="mb-4">
      {label && (
        <label className="block text-sm font-semibold text-gray-600 mb-1.5">
          {label}
        </label>
      )}
      <textarea
        className={clsx(
          "w-full rounded-xl border-2 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 resize-none",
          "focus:outline-none focus:border-primary focus:bg-white transition-colors",
          error ? "border-red-400" : "border-gray-200",
          className,
        )}
        rows={3}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ─── Badge / StatusBadge ──────────────────────────────────────────────────────
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "../../constants";

export function StatusBadge({
  status,
  size = "md",
}: {
  status: string;
  size?: "sm" | "md";
}) {
  const c = ORDER_STATUS_COLORS[status] ?? {
    bg: "bg-gray-100",
    text: "text-gray-600",
    dot: "bg-gray-400",
  };
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 font-semibold rounded-full",
        c.bg,
        c.text,
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs",
      )}
    >
      <span
        className={clsx(
          "rounded-full",
          c.dot,
          size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2",
        )}
      />
      {ORDER_STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
export function Spinner({ className }: { className?: string }) {
  return (
    <Loader2
      className={clsx("animate-spin text-primary", className ?? "w-8 h-8")}
    />
  );
}

export function PageSpinner() {
  return (
    <div className="flex h-64 items-center justify-center">
      <Spinner />
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = "max-w-md",
}: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={clsx(
          "relative bg-white rounded-2xl shadow-2xl w-full p-6",
          maxWidth,
        )}
      >
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
export function EmptyState({
  emoji,
  title,
  subtitle,
  action,
  onAction,
}: {
  emoji: string;
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <span className="text-5xl mb-4">{emoji}</span>
      <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
      {subtitle && (
        <p className="text-gray-500 text-sm mb-6 max-w-xs">{subtitle}</p>
      )}
      {action && (
        <Button variant="ghost" onClick={onAction}>
          {action}
        </Button>
      )}
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
export function SectionHeader({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      {action && (
        <button
          onClick={onAction}
          className="text-sm font-semibold text-primary hover:underline"
        >
          {action}
        </button>
      )}
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────
export function Card({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      className={clsx(
        "bg-white rounded-xl border border-gray-100 shadow-card",
        className,
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

// ─── Select ───────────────────────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
  error?: string;
}

export function Select({
  label,
  options,
  error,
  className,
  ...props
}: SelectProps) {
  return (
    <div className="mb-4">
      {label && (
        <label className="block text-sm font-semibold text-gray-600 mb-1.5">
          {label}
        </label>
      )}
      <select
        className={clsx(
          "w-full rounded-xl border-2 bg-gray-50 px-4 py-2.5 text-sm text-gray-900",
          "focus:outline-none focus:border-primary focus:bg-white transition-colors appearance-none",
          error ? "border-red-400" : "border-gray-200",
          className,
        )}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ─── Toggle ───────────────────────────────────────────────────────────────────
export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <div
        onClick={() => onChange(!checked)}
        className={clsx(
          "relative w-12 h-6 rounded-full transition-colors",
          checked ? "bg-primary" : "bg-gray-300",
        )}
      >
        <span
          className={clsx(
            "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform",
            checked && "translate-x-6",
          )}
        />
      </div>
      {label && (
        <span className="text-sm font-semibold text-gray-700">{label}</span>
      )}
    </label>
  );
}

// ─── StarRating ───────────────────────────────────────────────────────────────
export function StarRating({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange?: (v: number) => void;
  label?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      {label && (
        <span className="text-sm font-semibold text-gray-700 w-24">
          {label}
        </span>
      )}
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange?.(v)}
            className={clsx(
              "text-2xl transition-transform hover:scale-110",
              onChange && "cursor-pointer",
            )}
          >
            {v <= value ? "⭐" : "☆"}
          </button>
        ))}
      </div>
    </div>
  );
}
