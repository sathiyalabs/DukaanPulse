import {
  scopeFor,
  readState,
  saveState,
  response,
  sameOrigin,
} from "@/lib/server";
import { execute } from "@/lib/commands";
export async function GET(req: Request) {
  try {
    const { scope, cookie } = await scopeFor(req);
    return response({ state: await readState(scope) }, 200, cookie);
  } catch (err) {
    console.error("GET /api/state error:", err);
    return response({ error: "storageUnavailable" }, 503);
  }
}
export async function POST(req: Request) {
  if (!sameOrigin(req)) return response({ error: "forbidden" }, 403);
  try {
    if (Number(req.headers.get("content-length") || 0) > 2300000)
      return response({ error: "fileSize" }, 413);
    const { scope, cookie } = await scopeFor(req),
      current = await readState(scope),
      input = await req.json(),
      next = execute(current, input);
    if (next !== current) await saveState(scope, next, current.version);
    return response({ state: next }, 200, cookie);
  } catch (e) {
    const code = e instanceof Error ? e.message : "invalidInput";
    return response(
      {
        error: [
          "staleVersion",
          "staleApproval",
          "ineligible",
          "duplicateExperiment",
          "fileSize",
          "rowLimit",
          "csvSyntax",
          "mappingRequired",
          "noValidRows",
          "emptyCsv",
          "duplicateHeaders",
          "invalidInput",
          "historyLimit",
          "transition",
          "notFound",
          "confirmRun",
          "followupDate",
        ].includes(code)
          ? code
          : "network",
      },
      code === "staleVersion" ? 409 : 400,
    );
  }
}
