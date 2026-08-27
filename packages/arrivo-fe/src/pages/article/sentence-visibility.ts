import type { SentenceTextVisibility } from '@arrivo/contracts';

export function resolveSentenceTextVisibility(
  saved: SentenceTextVisibility | undefined,
  defaults: SentenceTextVisibility
) {
  return saved ?? defaults;
}
