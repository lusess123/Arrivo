import type { AuthUserDto } from "@arrivo/contracts";
import type { ArrivoWorkerEnv } from "./env";

export type RequestContext = {
  env: ArrivoWorkerEnv;
  requestId: string;
  startedAtMs: number;
  user?: AuthUserDto;
};
