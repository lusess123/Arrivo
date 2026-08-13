import type { ArticleSentenceDto, LearningLanguageCode } from '@arrivo/contracts';

export type SentenceNode = ArticleSentenceDto & {
  originalContent: string;
  translatedContent: string;
  children: SentenceNode[];
};

export type SentenceDisplayRow = {
  sentence: SentenceNode;
  depth: number;
  displayNumber: string;
  expanded: boolean;
  playable: boolean;
};

const compareSentence = (left: ArticleSentenceDto, right: ArticleSentenceDto) => (
  left.sortOrder - right.sortOrder || left.id.localeCompare(right.id)
);

export function buildSentenceTree(
  sentences: ArticleSentenceDto[],
  languageCode: LearningLanguageCode = 'en'
): SentenceNode[] {
  const nodes = new Map<string, SentenceNode>();
  for (const sentence of sentences.filter((item) => (item.languageCode || 'en') === languageCode)) {
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

export function getMissingSentenceGroups(
  sentences: ArticleSentenceDto[],
  languageCode: LearningLanguageCode
) {
  const roots = sentences.filter((sentence) => sentence.parentSentenceId === null);
  const activeGroups = new Set(
    roots.filter((sentence) => sentence.languageCode === languageCode)
      .map((sentence) => sentence.sentenceGroupId || sentence.id)
  );
  return getSentenceGroups(sentences)
    .filter((group) => !activeGroups.has(group.sentenceGroupId))
    .sort((left, right) => left.sortOrder - right.sortOrder);
}

export function getSentenceGroups(sentences: ArticleSentenceDto[]) {
  const groups = new Map<string, { sentenceGroupId: string; sortOrder: number }>();
  for (const sentence of sentences) {
    if (sentence.parentSentenceId !== null) continue;
    const sentenceGroupId = sentence.sentenceGroupId || sentence.id;
    const current = groups.get(sentenceGroupId);
    if (!current || sentence.sortOrder < current.sortOrder) {
      groups.set(sentenceGroupId, { sentenceGroupId, sortOrder: sentence.sortOrder });
    }
  }
  return [...groups.values()].sort((left, right) => left.sortOrder - right.sortOrder);
}

export function mergeGeneratedSentences<T extends {
  id: string;
  languageCode?: string;
  sentenceGroupId?: string;
  parentSentenceId?: string | null;
}>(current: T[], incoming: T[], generatedLanguage: string) {
  const merged = new Map(current.map((sentence) => [sentence.id, sentence]));
  const currentGroups = new Set(current
    .filter((sentence) => sentence.parentSentenceId == null)
    .map((sentence) => sentence.sentenceGroupId ?? sentence.id));
  for (const sentence of incoming) {
    if (merged.has(sentence.id)) continue;
    if (sentence.parentSentenceId != null || sentence.languageCode !== generatedLanguage) continue;
    if (!currentGroups.has(sentence.sentenceGroupId ?? sentence.id)) continue;
    merged.set(sentence.id, sentence);
  }
  return [...merged.values()];
}

export function getSentenceDisplayRows(
  roots: SentenceNode[],
  expandedSentenceIds: ReadonlySet<string>,
  rootOffset = 0,
): SentenceDisplayRow[] {
  const rows: SentenceDisplayRow[] = [];
  const visit = (node: SentenceNode, depth: number, displayNumber: string) => {
    const expanded = node.children.length > 0 && expandedSentenceIds.has(node.id);
    rows.push({ sentence: node, depth, displayNumber, expanded, playable: !expanded });
    if (expanded) node.children.forEach((child, index) => visit(child, depth + 1, `${displayNumber}.${index + 1}`));
  };
  roots.forEach((root, index) => visit(root, 0, String(rootOffset + index + 1)));
  return rows;
}

export function getPlayableSentences(rows: SentenceDisplayRow[]) {
  return rows.filter((row) => row.playable).map((row) => row.sentence);
}
