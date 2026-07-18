const apiBaseUrl = process.env.ARRIVO_API_BASE_URL || "https://api-arrivo.zyking.xyz";
const batchSecret = process.env.AI_BATCH_SECRET;

if (!batchSecret) {
  throw new Error("请设置 AI_BATCH_SECRET");
}

let totalProcessed = 0;
let totalFailed = 0;

while (true) {
  const response = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/api/articles/sentence-split/analyze-batch`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-ai-batch-secret": batchSecret
    },
    body: JSON.stringify({ limit: 20, retryFailed: false })
  });
  if (!response.ok) throw new Error(`批量分析失败 (${response.status}): ${await response.text()}`);
  const body = await response.json() as {
    data: { processed: number; failed: number; remaining: number; hasMore: boolean };
  };
  totalProcessed += body.data.processed;
  totalFailed += body.data.failed;
  console.log(JSON.stringify({ ...body.data, totalProcessed, totalFailed }));
  if (!body.data.hasMore || body.data.processed === 0) break;
}
