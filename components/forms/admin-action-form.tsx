"use client";

import { FormEvent, ReactNode } from "react";
import { toast } from "sonner";

type AdminActionFormProps = {
  action: (formData: FormData) => void | Promise<void>;
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
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (confirmMessage && !window.confirm(confirmMessage)) {
      event.preventDefault();
      return;
    }

    toast.success(successMessage);
  }

  return (
    <form action={action} className={className} onSubmit={handleSubmit}>
      {children}
    </form>
  );
}
