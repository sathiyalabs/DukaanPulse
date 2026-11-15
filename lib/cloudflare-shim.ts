// Cloudflare Workers shim for Node.js / Next.js / Vercel environments
export const env = typeof process !== "undefined" ? process.env : {};

export class WorkerEntrypoint {}
export class DurableObject {}
export class WorkflowEntrypoint {}

const cloudflareShim = {
  env,
  WorkerEntrypoint,
  DurableObject,
  WorkflowEntrypoint,
};

export default cloudflareShim;
