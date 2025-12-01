import { initSocketServer } from './lib/socketServer';

export async function register() {
  // Only start the Socket.IO server in the Node.js runtime (not on edge)
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  initSocketServer();
}
