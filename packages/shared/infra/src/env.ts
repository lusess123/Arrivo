export function readPositiveInteger({
  value,
  fallback
}: {
  value: string | undefined;
  fallback: number;
}) {
  const parsed = Number(value ?? fallback);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function readBoolean({ value }: { value: string | undefined }) {
  return ["1", "true", "yes", "on"].includes((value ?? "").trim().toLowerCase());
}
