export const runtime = "nodejs";

export async function register() {
  const { initSocketServer } = await import("./lib/socketServer");
  initSocketServer();
}
