"use client";

import { FormEvent, ReactNode, useState, useTransition } from "react";
import { toast } from "sonner";

type AdminActionFormProps = {
  action: (formData: FormData) => void | Promise<void | { ok?: boolean; message?: string }>;
  children: ReactNode;
  className?: string;
  confirmMessage?: string;
  successMessage: string;
};

export function AdminActionForm({
  action,
  children,
  className,
  confirmMessage,
  successMessage
}: AdminActionFormProps) {
  const [isPending, startTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (confirmMessage && !window.confirm(confirmMessage)) {
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);

    setIsSubmitting(true);
    startTransition(async () => {
      try {
        const result = await action(formData);

        if (result && result.ok === false) {
          toast.error(result.message ?? "Nao foi possivel concluir a acao.");
          return;
        }

        toast.success(result?.message ?? successMessage);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Nao foi possivel concluir a acao.");
      } finally {
        setIsSubmitting(false);
      }
    });
  }

  return (
    <form className={className} onSubmit={handleSubmit}>
      {children}
      {(isPending || isSubmitting) && (
        <span className="sr-only" aria-live="polite">
          Salvando
        </span>
      )}
    </form>
  );
}
