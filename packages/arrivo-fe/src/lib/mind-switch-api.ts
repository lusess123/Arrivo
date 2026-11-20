import axios from "axios";
import type { ApiFailure, MindSwitchChange } from "@arrivo/contracts";

export const mindSwitchPath = "/api/mind-switch";
export const mindSwitchTimeout = 12000;

export function submitMindSwitchChange(accountId: string, change: MindSwitchChange) {
  return axios.post(mindSwitchPath, { accountId, change }, { timeout: mindSwitchTimeout });
}

export function mindSwitchErrorCode(error: unknown) {
  return axios.isAxiosError<ApiFailure>(error) ? error.response?.data?.code : undefined;
}

export function mindSwitchError(error: unknown): string {
  if (axios.isAxiosError<ApiFailure>(error) && error.response) {
    return error.response.data?.message || "操作未完成，请重试";
  }
  return error instanceof Error && !axios.isAxiosError(error)
    ? error.message
    : "连接失败，内容仍在此页面，请联网后重试";
}
