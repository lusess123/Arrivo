import { z } from "zod";

function isSafePagePath(value: string) {
  try {
    const target = new URL(value, "https://arrivo.local");
    return (
      target.origin === "https://arrivo.local" && target.pathname !== "/login"
    );
  } catch {
    return false;
  }
}

export const lastVisitedPageInputSchema = z.object({
  path: z
    .string()
    .min(1)
    .max(2048)
    .refine(isSafePagePath, "页面地址必须是站内非登录页地址"),
});

export type LastVisitedPageInput = z.infer<typeof lastVisitedPageInputSchema>;
