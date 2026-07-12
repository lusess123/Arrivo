import type { ArrivoWorkerEnv } from "@arrivo/runtime";
import type { AuthUserDto } from "@arrivo/contracts";

export type AppEnv = {
  Bindings: ArrivoWorkerEnv;
  Variables: {
    requestId: string;
    requestStartedAtMs: number;
    user?: AuthUserDto;
  };
};
