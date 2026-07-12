import type { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import {
  mddActionParamSchema,
  mddListActionParamSchema,
  mddMetaRequestSchema,
  mddNameQuerySchema,
  mddNamesBodySchema,
  mddViewQuerySchema
} from "@arrivo/contracts";
import {
  deleteMddSingle,
  getMddDicts,
  getMddEditView,
  getMddListView,
  getMddMeta,
  getMddModel,
  getMddModels,
  queryMddList,
  queryMddSingle,
  submitMddSingle
} from "@arrivo/application";
import { httpError } from "@arrivo/runtime";
import type { AppEnv } from "../context";
import { ok } from "../http";
import { requireUser } from "../middleware/auth.middleware";

function route(prefix: string, path: string) {
  return `${prefix}${path}`;
}

export function registerMddRoutes(app: Hono<AppEnv>, prefix = "") {
  app.get(route(prefix, "/mdd/model"), requireUser, zValidator("query", mddNameQuerySchema), (c) => {
    const input = c.req.valid("query");
    return ok(c, getMddModel(input.name));
  });

  app.post(route(prefix, "/mdd/models"), requireUser, zValidator("json", mddNamesBodySchema), (c) => {
    const input = c.req.valid("json");
    return ok(c, getMddModels(input.names));
  });

  app.get(route(prefix, "/mdd/list"), requireUser, zValidator("query", mddNameQuerySchema), (c) => {
    const input = c.req.valid("query");
    return ok(c, getMddListView(input.name));
  });

  app.get(route(prefix, "/mdd/view"), requireUser, zValidator("query", mddViewQuerySchema), (c) => {
    const input = c.req.valid("query");
    return ok(c, getMddEditView(input.name, input.viewtype));
  });

  app.post(route(prefix, "/mdd/dicts"), requireUser, zValidator("json", mddNamesBodySchema), (c) => {
    const input = c.req.valid("json");
    return ok(c, getMddDicts(input.names));
  });

  app.post(route(prefix, "/mdd/meta"), requireUser, zValidator("json", mddMetaRequestSchema), (c) => {
    const input = c.req.valid("json");
    return ok(c, getMddMeta(input));
  });

  app.post(route(prefix, "/mdd/querysingleaction"), requireUser, zValidator("json", mddActionParamSchema), async (c) => {
    const user = c.get("user");
    if (!user) throw httpError.unauthorized();
    const input = c.req.valid("json");
    return ok(c, await queryMddSingle({ user, params: input }));
  });

  app.post(route(prefix, "/mdd/querylistaction"), requireUser, zValidator("json", mddListActionParamSchema), async (c) => {
    const user = c.get("user");
    if (!user) throw httpError.unauthorized();
    const input = c.req.valid("json");
    return ok(c, await queryMddList({ user, params: input }));
  });

  app.post(route(prefix, "/mdd/delsingleaction"), requireUser, zValidator("json", mddActionParamSchema), async (c) => {
    const user = c.get("user");
    if (!user) throw httpError.unauthorized();
    const input = c.req.valid("json");
    return ok(c, await deleteMddSingle({ user, params: input }));
  });

  app.post(route(prefix, "/mdd/newsingleaction"), requireUser, zValidator("json", mddActionParamSchema), async (c) => {
    const user = c.get("user");
    if (!user) throw httpError.unauthorized();
    const input = c.req.valid("json");
    return ok(c, await submitMddSingle({ user, params: input }));
  });
}
