export type SendEmailOptions = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type EmailClient = {
  isConfigured: boolean;
  send(options: SendEmailOptions): Promise<void>;
};

export function createResendEmailClient({
  apiKey,
  from
}: {
  apiKey?: string;
  from?: string;
}): EmailClient {
  return {
    isConfigured: Boolean(apiKey && from),
    async send(options) {
      if (!apiKey || !from) {
        throw new Error("Email service is not configured.");
      }

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from,
          to: options.to,
          subject: options.subject,
          text: options.text,
          html: options.html
        })
      });

      if (!response.ok) {
        const message = await response.text().catch(() => "");
        throw new Error(`Failed to send email: ${response.status} ${message}`);
      }
    }
  };
}
