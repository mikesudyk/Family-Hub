import { io } from 'socket.io-client';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

let socket = null;

export function connectSocket(token) {
  if (socket) socket.disconnect();
  socket = io(BASE, {
    auth: { token },
    transports: ['websocket'],
  });
  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
