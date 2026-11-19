import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import type {
  ApiFailure,
  ApiSuccess,
  MindSwitchChange,
  MindSwitchSnapshot,
} from "@arrivo/contracts";

const route = "/api/mind-switch";
const timeout = 12000;

type ReadResponse = { accountId: string; snapshot: MindSwitchSnapshot | null };

function requestSnapshot(signal: AbortSignal, revision?: string) {
  return axios.get<ApiSuccess<ReadResponse>>(route, {
    signal,
    timeout,
    params: revision ? { revision } : undefined,
  }).then(({ data }) => data.data);
}

function errorCode(error: unknown) {
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

export function useMindSwitch() {
  const [snapshot, setSnapshot] = useState<MindSwitchSnapshot | null>(null);
  const [sync, setSync] = useState<"loading" | "ready" | "failed">("loading");
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const activeSnapshot = useRef<MindSwitchSnapshot | null>(null);
  const reading = useRef<AbortController | null>(null);
  const writing = useRef(false);

  const accountChanged = useCallback(() => {
    activeSnapshot.current = null;
    setSnapshot(null);
    window.location.reload();
  }, []);

  const refresh = useCallback(async (force = false) => {
    if (writing.current || (!force && reading.current)) return;
    reading.current?.abort();
    const controller = new AbortController();
    reading.current = controller;
    try {
      const previous = activeSnapshot.current;
      const result = await requestSnapshot(controller.signal, force ? undefined : previous?.revision);
      if (controller.signal.aborted) return;
      if (previous && result.accountId !== previous.accountId) {
        accountChanged();
        return;
      }
      if (result.snapshot) {
        activeSnapshot.current = result.snapshot;
        setSnapshot(result.snapshot);
      }
      setLastSynced(new Date());
      setSync("ready");
    } catch {
      if (!controller.signal.aborted) setSync("failed");
    } finally {
      if (reading.current === controller) reading.current = null;
    }
  }, [accountChanged]);

  useEffect(() => {
    const refreshVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const offline = () => setSync("failed");
    void refresh();
    const timer = window.setInterval(refreshVisible, 20000);
    document.addEventListener("visibilitychange", refreshVisible);
    window.addEventListener("focus", refreshVisible);
    window.addEventListener("pageshow", refreshVisible);
    window.addEventListener("online", refreshVisible);
    window.addEventListener("offline", offline);

    return () => {
      reading.current?.abort();
      reading.current = null;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshVisible);
      window.removeEventListener("focus", refreshVisible);
      window.removeEventListener("pageshow", refreshVisible);
      window.removeEventListener("online", refreshVisible);
      window.removeEventListener("offline", offline);
    };
  }, [refresh]);

  async function change(input: MindSwitchChange) {
    const previous = activeSnapshot.current;
    if (!previous || writing.current) throw new Error("正在同步，请稍后重试");

    writing.current = true;
    reading.current?.abort();
    reading.current = null;
    let focusChanged = false;
    try {
      await axios.post(route, { accountId: previous.accountId, change: input }, { timeout });
    } catch (error) {
      const code = errorCode(error);
      focusChanged = code === "FOCUS_CHANGED";
      if (code === "ACCOUNT_CHANGED") accountChanged();
      if (!axios.isAxiosError(error) || !error.response || error.response.status >= 500) setSync("failed");
      throw error;
    } finally {
      writing.current = false;
      if (focusChanged) void refresh();
    }
    await refresh();
  }

  async function exportWorkspace() {
    const previous = activeSnapshot.current;
    if (!previous) throw new Error("正在同步，请稍后重试");
    const controller = new AbortController();
    const result = await requestSnapshot(controller.signal);
    if (result.accountId !== previous.accountId) {
      accountChanged();
      return;
    }
    if (!result.snapshot) throw new Error("导出未完成，请重试");
    const { accountId, revision, ...data } = result.snapshot;
    const blob = new Blob(
      [JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), ...data }, null, 2)],
      { type: "application/json;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Arrivo-心智切换-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return { snapshot, sync, lastSynced, refresh, change, exportWorkspace };
}
