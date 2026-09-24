import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { cn } from "../../lib/cn";
import { IconChevronDown, IconSearch } from "../icons";

interface Wrap {
  label?: string;
  hint?: string;
  error?: string;
}

function FieldShell({
  label,
  hint,
  error,
  id,
  children,
}: Wrap & { id: string; children: ReactNode }) {
  return (
    <div className="field">
      {label && (
        <label className="field__label" htmlFor={id}>
          {label}
        </label>
      )}
      {children}
      {error ? (
        <span className="field__error">{error}</span>
      ) : hint ? (
        <span className="field__hint">{hint}</span>
      ) : null}
    </div>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement>, Wrap {}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, className, id, ...rest },
  ref
) {
  const auto = useId();
  const fieldId = id ?? auto;
  return (
    <FieldShell label={label} hint={hint} error={error} id={fieldId}>
      <input
        ref={ref}
        id={fieldId}
        aria-invalid={error ? true : undefined}
        className={cn("input", className)}
        {...rest}
      />
    </FieldShell>
  );
});

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement>, Wrap {}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, className, id, children, ...rest },
  ref
) {
  const auto = useId();
  const fieldId = id ?? auto;
  return (
    <FieldShell label={label} hint={hint} error={error} id={fieldId}>
      <span className="select-wrap">
        <select ref={ref} id={fieldId} className={cn("input", className)} {...rest}>
          {children}
        </select>
        <IconChevronDown />
      </span>
    </FieldShell>
  );
});

export function SearchInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="search">
      <IconSearch size={18} />
      <input type="search" className="input" {...props} />
    </div>
  );
}
