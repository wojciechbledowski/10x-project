import { useId } from "react";

interface TextFieldProps {
  label: string;
  name: string;
  type?: "text" | "email";
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  helperText?: string;
}

/**
 * Reusable text/email input field with built-in accessibility and error handling
 */
export function TextField({
  label,
  name,
  type = "text",
  value,
  onChange,
  error,
  placeholder,
  disabled = false,
  helperText,
}: TextFieldProps) {
  const inputId = useId();
  const errorId = `${inputId}-error`;

  return (
    <div>
      <label htmlFor={inputId} className="mb-2 block text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        type={type}
        id={inputId}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-md border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${
          error ? "border-destructive" : "border-input bg-background"
        }`}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error ? errorId : undefined}
      />
      {helperText && !error && <p className="mt-1 text-xs text-muted-foreground">{helperText}</p>}
      {error && (
        <p id={errorId} className="mt-1 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
