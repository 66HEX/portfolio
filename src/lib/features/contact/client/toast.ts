import { toast } from "varsel";
import ContactToast from "$lib/features/contact/components/ContactToast.svelte";

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
