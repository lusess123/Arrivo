type ClipboardWriter = Pick<Clipboard, 'writeText'>;

export function copySentenceText(
  text: string,
  clipboard: ClipboardWriter = navigator.clipboard
) {
  return clipboard.writeText(text);
}
