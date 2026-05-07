import { io } from 'socket.io-client';

class SocketService {
	constructor() {
		this.socket = null;
		this.listeners = new Map();
		this.connected = false;
	}

	connect(url = window.location.origin) {
		if (this.socket?.connected) return this.socket;

		this.socket = io(url, {
			transports: ['websocket', 'polling'],
			reconnection: true,
			reconnectionAttempts: 5,
			reconnectionDelay: 1000,
		});

		this.socket.on('connect', () => {
			this.connected = true;
			console.log('[Socket] Connected:', this.socket?.id);
		});

		this.socket.on('disconnect', (reason) => {
			this.connected = false;
			console.log('[Socket] Disconnected:', reason);
		});

		this.socket.on('connect_error', (err) => {
			console.warn('[Socket] Connection error:', err?.message || err);
		});

		return this.socket;
	}

	on(event, callback) {
		if (!this.socket) this.connect();
		this.socket.on(event, callback);

		if (!this.listeners.has(event)) this.listeners.set(event, new Set());
		this.listeners.get(event).add(callback);

		return () => this.off(event, callback);
	}

	off(event, callback) {
		this.socket?.off(event, callback);
		this.listeners.get(event)?.delete(callback);
	}

	emit(event, data) {
		this.socket?.emit(event, data);
	}

	isConnected() {
		return this.connected && !!this.socket?.connected;
	}

	disconnect() {
		this.socket?.disconnect();
		this.socket = null;
		this.connected = false;
		this.listeners.clear();
	}

	getSocket() {
		return this.socket;
	}
}

export const socketService = new SocketService();
