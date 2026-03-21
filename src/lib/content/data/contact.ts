import type { HomepageContent } from "../types";

export const contactData: Pick<HomepageContent, "contact"> = {
  contact: {
    title: "Contact",
    form: {
      nameLabel: "Name",
      emailLabel: "Email",
      subjectLabel: "Subject",
      messageLabel: "Message",
      submitLabel: "Send message",
      sendingLabel: "Sending...",
      successLabel: "Message sent successfully. Thanks for reaching out.",
      errorLabel: "Couldn't send the message right now. Try again in a moment.",
      validationErrorLabel: "Please fill all fields with valid details before sending.",
      privacyNote: "By sending this form, you agree to be contacted back about your inquiry.",
    },
  },
};
