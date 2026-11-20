import axios from "axios";
import { translate, type Translate, type MessagePair } from "./locale";
import type { ApiFailure, MindSwitchChange } from "@arrivo/contracts";

export const mindSwitchPath = "/api/mind-switch";
export const mindSwitchTimeout = 12000;

export function submitMindSwitchChange(accountId: string, change: MindSwitchChange) {
  return axios.post(mindSwitchPath, { accountId, change }, { timeout: mindSwitchTimeout });
}

export function mindSwitchErrorCode(error: unknown) {
  return axios.isAxiosError<ApiFailure>(error) ? error.response?.data?.code : undefined;
}

const errorMessages = new Map<string, string>([
  ["请检查必填内容、长度和日期", "Check the required fields, text length, and dates."],
  ["同步版本无效", "This sync version is invalid. Refresh and try again."],
  ["账号已切换，请重新打开页面", "Your account has changed. Reopen this page."],
  ["焦点已在其他设备切换。你的备注仍在这个窗口，请核对后重新发起切换。", "Your focus changed on another device. Your notes are still here. Check the current task before switching again."],
  ["任务已归档或不存在", "This task has been archived or is no longer available."],
  ["资源不存在", "This item is no longer available."],
  ["权限不足", "You don’t have permission to do that."],
  ["请先登录", "Please sign in first."],
  ["服务器错误", "A server error occurred. Try again."],
  ["正在同步，请稍后重试", "Sync is in progress. Try again in a moment."],
  ["导出未完成，请重试", "The export could not be completed. Try again."],
  ["请输入任务名称", "Enter a task name."],
  ["请选择可用的任务", "Choose an available task."],
  ["登录后即可保存任务，请重试。", "Sign in and try again to save your task."],
  ["浏览器无法带上这条草稿，请先登录再添加。", "This browser can’t keep your draft during sign-in. Sign in first, then add the task."],
]);

export function mindSwitchErrorCopy(error: unknown): MessagePair {
  if (axios.isAxiosError(error) && !error.response) {
    return ["连接失败，内容仍在此页面，请联网后重试", "Couldn’t connect. Your draft is still here. Reconnect and try again."];
  }
  const message = axios.isAxiosError<ApiFailure>(error) ? error.response?.data?.message
    : error instanceof Error ? error.message : undefined;
  const english = message && errorMessages.get(message);
  if (message && english) return [message, english];
  return ["操作未完成，请重试", "That didn’t go through. Please try again."];
}

export function mindSwitchError(error: unknown, t: Translate = translate) {
  return t(...mindSwitchErrorCopy(error));
}
