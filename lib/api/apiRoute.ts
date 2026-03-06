import { NextRequest } from "next/server";
import { requireApiContext } from "./requireApiContext";

type HandlerContext = {
  req: NextRequest;
  supabase: any;
  user: { id: string };
  orgId: string | null;
  params: any;
  body: any;
};

type Options = {
  module?: string;
  requireOrg?: boolean;
  parseBody?: boolean;
};

export function apiRoute(
  options: Options,
  handler: (ctx: HandlerContext) => Promise<Response>
) {
  return async function routeHandler(
    req: NextRequest,
    context: { params?: Promise<any> }
  ) {
    const auth = await requireApiContext({
      requireOrg: options.requireOrg ?? false,
      module: options.module,
    });

    if (!auth.ok) {
      return auth.res;
    }

    const { supabase, user, orgId } = auth.ctx;

    let params: any = {};
    if (context?.params) {
      params = await context.params;
    }

    let body: any = null;
    const shouldParseBody = options.parseBody ?? req.method !== "GET";

    if (shouldParseBody) {
      try {
        body = await req.json();
      } catch {
        body = null;
      }
    }

    return handler({
      req,
      supabase,
      user,
      orgId,
      params,
      body,
    });
  };
}