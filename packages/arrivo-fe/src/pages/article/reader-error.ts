import type { MessagePair } from "@/lib/locale";

export interface ReaderProblem {
  code?: string;
  reason?: string;
  message?: string;
}

const englishMessages: Record<string, string> = {
  "文章不存在": "This article could not be found. Return to the library and choose another article.",
  "句子不存在": "This sentence is no longer available. Reload the article.",
  "对应的句子组不存在": "This sentence group is no longer available. Reload the article.",
  "只能编辑自己的文章": "You can only edit articles you own.",
  "这个句子已经有该语言内容": "This sentence already has text in that language. Edit the existing text.",
  "只能移动文章根句子": "Only top-level sentences can be reordered.",
  "部分句子缺少可用于生成的英语内容": "Add English text to the missing sentences, then try again.",
  "句子切分 AI 尚未配置": "Sentence splitting is unavailable because its AI service has not been configured.",
  "不能同时纠错和强制切分": "Choose either regeneration or a forced split.",
  "只有已切分句子可以重新生成": "Split this sentence before regenerating it.",
  "这个句子已经不能继续切分": "This sentence cannot be split any further.",
  "这个句子正在切分": "This sentence is already being split. Wait for the current split to finish.",
  "至少需要两个子句": "The result needs at least two parts. Try regenerating.",
  "强制切分至少需要两个子句": "A forced split needs at least two parts. Try regenerating.",
  "强制切分必须生成至少两个完整短句": "A forced split needs at least two complete sentences. Try regenerating.",
  "子句的目标语言和中文不能为空": "Each part needs both the original text and a Chinese translation. Try regenerating.",
  "切分结果遗漏或改写了目标语言原句": "The split changed or omitted part of the original. Try regenerating.",
  "强制切分生成了重复子句": "The split produced duplicate parts. Try regenerating.",
  "强制切分改动了过多核心单词": "The split changed too many key words. Try regenerating.",
  "LLM 返回了不完整的子句": "A generated part was incomplete. Try regenerating.",
  "LLM 返回了无效的切分结果": "The generated split was invalid. Try regenerating.",
  "不可切分结果不应包含子句": "The result contained parts even though it marked the sentence as indivisible. Try regenerating.",
  "子句可切分判断无效": "The model could not determine whether a part could be split. Try regenerating.",
  "LLM 输出在子句完成前中断": "Generation stopped before the sentence was complete. Try regenerating.",
  "无法直接切分，正在自动调整表达": "This sentence needs rephrasing before it can be split. Retrying…",
  "切分结果不合格，正在自动调整后重新生成": "The split did not pass validation. Adjusting the text and retrying…"
};

export function readerError(problem: ReaderProblem | undefined, fallback: MessagePair): MessagePair {
  if (problem?.code === "OFFLINE_CONTENT_UNAVAILABLE") {
    return problem.reason === "USER_SCOPE_UNAVAILABLE"
      ? ["离线时无法确认当前用户。请联网重新登录后打开文章。", "Reconnect and sign in to access articles saved for your account."]
      : ["此文章尚未离线缓存。请联网打开一次。", "This article is not available offline yet. Open it once while connected."];
  }
  const detail = typeof problem?.message === "string" ? problem.message : "";
  const english = englishMessages[detail];
  if (typeof english === "string") return [detail, english];
  const incompletePart = detail.match(/^子句过短或缺少有效内容：(.+)$/s);
  if (incompletePart) return [detail, `This part is too short or incomplete: ${incompletePart[1]}`];
  const wrongCount = detail.match(/^强制切分必须生成 (\d+) 个子句$/);
  if (wrongCount) return [detail, `The split needs exactly ${wrongCount[1]} parts. Try regenerating.`];
  if (problem?.code === "UNAUTHORIZED") return ["请重新登录后再试。", "Sign in again and retry."];
  return fallback;
}
