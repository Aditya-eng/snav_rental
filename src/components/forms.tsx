"use client";

import { createContext, startTransition, useActionState, useContext, useEffect, useRef, type ComponentProps, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Alert, buttonClass } from "./ui";
import type { ActionState } from "@/lib/action-state";

const PendingContext = createContext<boolean | null>(null);

/**
 * Form bound to a server action through useActionState. Submits via onSubmit so the browser
 * keeps what the person typed when the action returns an error.
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
  confirm,
  inlineMessage = false,
  ...rest
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  confirm?: string;
  /** Show the result as a short inline note (for table-row forms). */
  inlineMessage?: boolean;
} & Omit<ComponentProps<"form">, "action" | "onSubmit">) {
  const [state, formAction, pending] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <PendingContext.Provider value={pending}>
      <form
        ref={ref}
        className={className}
        onSubmit={async (e) => {
          e.preventDefault();
          if (confirm && !window.confirm(confirm)) return;
          const fd = new FormData(e.currentTarget);
          const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
          if (submitter?.name) fd.set(submitter.name, submitter.value);
          const prepared = await shrinkImages(fd);
          startTransition(() => formAction(prepared));
        }}
        {...rest}
      >
        {children}
        {inlineMessage ? <InlineMessage state={state} /> : <FormMessage state={state} />}
      </form>
    </PendingContext.Provider>
  );
}

/** Downscales large photos (max 1600px, JPEG) so uploads stay small on mobile connections. */
async function shrinkImages(fd: FormData): Promise<FormData> {
  const out = new FormData();
  for (const [key, value] of fd.entries()) {
    if (value instanceof File && value.size > 600_000 && /^image\/(jpeg|png|webp)$/.test(value.type)) {
      out.append(key, await shrink(value).catch(() => value));
    } else if (!(value instanceof File) || value.size > 0) {
      out.append(key, value);
    }
  }
  return out;
}

async function shrink(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.82));
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
}

function InlineMessage({ state }: { state: ActionState }) {
  if (!state) return null;
  return (
    <span role={state.error ? "alert" : "status"} className={state.error ? "text-xs text-red-700" : "text-xs text-emerald-700"}>
      {state.error ?? state.message ?? ""}
    </span>
  );
}

export function FormMessage({ state }: { state: ActionState }) {
  if (!state) return null;
  if (state.error)
    return (
      <Alert tone="red" className="mt-3" >
        <span role="alert">{state.error}</span>
      </Alert>
    );
  if (state.message)
    return (
      <Alert tone="green" className="mt-3">
        <span role="status">{state.message}</span>
      </Alert>
    );
  return null;
}

export function SubmitButton({
  children,
  pendingText,
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & {
  pendingText?: string;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}) {
  const ctx = useContext(PendingContext);
  const status = useFormStatus();
  const pending = ctx ?? status.pending;
  return (
    <button type="submit" disabled={pending || props.disabled} className={buttonClass(variant, size, className)} {...props}>
      {pending ? (pendingText ?? "Saving…") : children}
    </button>
  );
}
