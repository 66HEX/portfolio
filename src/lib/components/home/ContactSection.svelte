<script lang="ts">
  import Send from "lucide-svelte/icons/send";
  import { toast } from "varsel";
  import type { HomepageContent } from "$lib/content/homepage-content";
  import { contactFormSchema } from "$lib/validation/contact";
  import Button from "../ui/Button.svelte";
  import ContactToast from "../ui/ContactToast.svelte";
  import ContentCard from "../ui/ContentCard.svelte";
  import Input from "../ui/Input.svelte";
  import SectionBlock from "../ui/SectionBlock.svelte";

  type Props = {
    content: HomepageContent["contact"];
  };

  type ContactForm = {
    name: string;
    email: string;
    subject: string;
    message: string;
    website: string;
  };

  let { content }: Props = $props();

  let pending = $state(false);
  let form = $state<ContactForm>({
    name: "",
    email: "",
    subject: "",
    message: "",
    website: "",
  });
  type ToastKind = "success" | "error" | "info";

  function collectValidationMessages(payload: ContactForm): string[] {
    const parsed = contactFormSchema.safeParse(payload);
    if (parsed.success) {
      return [];
    }

    const messages = parsed.error.issues.map((issue) => issue.message.trim()).filter((message) => message.length > 0);

    return [...new Set(messages)];
  }

  function showContactToast(kind: ToastKind, title: string, message: string, duration = 5000): void {
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

  function showValidationToasts(messages: string[]): void {
    for (const message of messages) {
      showContactToast("error", content.form.validationErrorLabel, message, 6000);
    }
  }

  async function handleSubmit(event: SubmitEvent): Promise<void> {
    event.preventDefault();

    if (pending) {
      return;
    }

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      subject: form.subject.trim(),
      message: form.message.trim(),
      website: form.website,
    };

    const validationMessages = collectValidationMessages(payload);
    if (validationMessages.length > 0) {
      showValidationToasts(validationMessages);
      return;
    }

    pending = true;

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMessage = content.form.errorLabel;
        let validationErrors: string[] = [];

        try {
          const errorBody = (await response.json()) as { message?: string; errors?: string[] };
          if (Array.isArray(errorBody.errors) && errorBody.errors.length > 0) {
            validationErrors = [
              ...new Set(errorBody.errors.map((item) => item.trim()).filter((item) => item.length > 0)),
            ];
          } else if (typeof errorBody.message === "string" && errorBody.message.length > 0) {
            errorMessage = errorBody.message;
          }
        } catch {
          // Keep fallback message.
        }

        if (validationErrors.length > 0) {
          showValidationToasts(validationErrors);
        } else {
          showContactToast("error", content.form.errorLabel, errorMessage, 6500);
        }

        return;
      }

      showContactToast("success", content.form.submitLabel, content.form.successLabel, 5000);

      form = {
        name: "",
        email: "",
        subject: "",
        message: "",
        website: "",
      };
    } catch {
      showContactToast("error", content.form.errorLabel, content.form.errorLabel, 6500);
    } finally {
      pending = false;
    }
  }
</script>

<SectionBlock title={content.title}>
  <ContentCard class="mx-auto w-full max-w-md">
    <form class="flex flex-col gap-3" novalidate onsubmit={handleSubmit}>
      <Input
        type="text"
        name="website"
        variant="hidden"
        tabindex="-1"
        autocomplete="off"
        bind:value={form.website}
        aria-hidden="true"
      />

      <label class="flex flex-col gap-2">
        <span class="text-gray-alpha-800 text-xs leading-none font-medium">{content.form.nameLabel}</span>
        <div class="input-highlight bg-background h-7.5 rounded-sm">
          <Input
            type="text"
            name="name"
            variant="field"
            size="field"
            placeholder="Jane Smith"
            minlength="2"
            maxlength="80"
            required
            bind:value={form.name}
          />
        </div>
      </label>

      <label class="flex flex-col gap-2">
        <span class="text-gray-alpha-800 text-xs leading-none font-medium">{content.form.emailLabel}</span>
        <div class="input-highlight bg-background h-7.5 rounded-sm">
          <Input
            type="email"
            name="email"
            variant="field"
            size="field"
            placeholder="jane@company.com"
            maxlength="160"
            required
            bind:value={form.email}
          />
        </div>
      </label>

      <label class="flex flex-col gap-2">
        <span class="text-gray-alpha-800 text-xs leading-none font-medium">{content.form.subjectLabel}</span>
        <div class="input-highlight bg-background h-7.5 rounded-sm">
          <Input
            type="text"
            name="subject"
            variant="field"
            size="field"
            placeholder="New landing page for SaaS product"
            minlength="3"
            maxlength="140"
            required
            bind:value={form.subject}
          />
        </div>
      </label>

      <label class="flex flex-col gap-2">
        <span class="text-gray-alpha-800 text-xs leading-none font-medium">{content.form.messageLabel}</span>
        <div class="input-highlight bg-background min-h-30 rounded-sm">
          <textarea
            name="message"
            class="text-foreground placeholder:text-gray-alpha-800 absolute inset-0 rounded-sm px-2 py-1.5 text-xs leading-relaxed transition-shadow duration-150 ease-out outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            placeholder="Briefly describe your project, scope, and timeline."
            minlength="20"
            maxlength="3000"
            required
            bind:value={form.message}
          ></textarea>
        </div>
      </label>

      <div class="mt-1 flex flex-col gap-2">
        <Button type="submit" variant="primary" size="form" disabled={pending}>
          <Send size={12} strokeWidth={2.25} />
          <span>{pending ? content.form.sendingLabel : content.form.submitLabel}</span>
        </Button>

        <p class="text-gray-alpha-800 text-center text-[10px] text-balance">
          {content.form.privacyNote}
        </p>
      </div>
    </form>
  </ContentCard>
</SectionBlock>
