import { io } from 'socket.io-client';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

let socket = null;

export function connectSocket() {
  if (socket) socket.disconnect();
  socket = io(BASE, {
    withCredentials: true, // sends httpOnly cookie with the WebSocket handshake
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
