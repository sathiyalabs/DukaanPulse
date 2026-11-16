// Provider credentials belong to the deployment owner, never to public requests.
export async function POST() {
  return Response.json(
    { error: "forbidden", message: "Provider configuration is managed by the site owner." },
    { status: 403, headers: { "Cache-Control": "no-store" } },
  );
}
