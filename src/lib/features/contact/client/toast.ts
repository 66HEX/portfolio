import { toast } from "varsel";
import ContactToast from "$lib/components/ui/ContactToast.svelte";

export type ToastKind = "success" | "error" | "info";

export function showContactToast(kind: ToastKind, title: string, message: string, duration = 5000): void {
  toast.custom(ContactToast, {
    duration,
    position: "bottom-center",
    componentProps: {
      kind,
      title,
      message,
    },
  });
}

export function showValidationToasts(messages: string[], validationErrorLabel: string): void {
  for (const message of messages) {
    showContactToast("error", validationErrorLabel, message, 6000);
  }
}
