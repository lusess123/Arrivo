import type { ArticleSentenceDto } from '@arrivo/contracts';

export type SentenceNode = ArticleSentenceDto & {
  originalContent: string;
  translatedContent: string;
  children: SentenceNode[];
};

export type SentenceDisplayRow = {
  sentence: SentenceNode;
  depth: number;
  expanded: boolean;
  playable: boolean;
};

const compareSentence = (left: ArticleSentenceDto, right: ArticleSentenceDto) => (
  left.sortOrder - right.sortOrder || left.id.localeCompare(right.id)
);

export function buildSentenceTree(sentences: ArticleSentenceDto[]): SentenceNode[] {
  const nodes = new Map<string, SentenceNode>();
  for (const sentence of sentences) {
    nodes.set(sentence.id, {
      ...sentence,
      originalContent: sentence.originalContent || '',
      translatedContent: sentence.translatedContent || '',
      children: [],
    });
  }

  const roots: SentenceNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.parentSentenceId ? nodes.get(node.parentSentenceId) : null;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  const sortTree = (items: SentenceNode[]) => {
    items.sort(compareSentence);
    items.forEach((item) => sortTree(item.children));
  };
  sortTree(roots);
  return roots;
}

export function getSentenceDisplayRows(
  roots: SentenceNode[],
  expandedSentenceIds: ReadonlySet<string>,
): SentenceDisplayRow[] {
  const rows: SentenceDisplayRow[] = [];
  const visit = (node: SentenceNode, depth: number) => {
    const expanded = node.children.length > 0 && expandedSentenceIds.has(node.id);
    rows.push({ sentence: node, depth, expanded, playable: !expanded });
    if (expanded) node.children.forEach((child) => visit(child, depth + 1));
  };
  roots.forEach((root) => visit(root, 0));
  return rows;
}

export function getPlayableSentences(rows: SentenceDisplayRow[]) {
  return rows.filter((row) => row.playable).map((row) => row.sentence);
}
