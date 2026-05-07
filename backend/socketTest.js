const io = require("socket.io-client");

console.log("Starting socket client...");

const socket = io("http://localhost:5000", {
  transports: ["websocket"]
});

// ✅ Connected
socket.on("connect", () => {
  console.log("✅ Connected to server");
  socket.emit("subscribe_ambulance", 1);
});

// ❌ Error
socket.on("connect_error", (err) => {
  console.log("❌ Connection error:", err.message);
});

// ❌ Disconnect
socket.on("disconnect", () => {
  console.log("❌ Disconnected");
});

// 📍 Location updates
socket.on("ambulance_location_update", (data) => {
  console.log("📍 Location Update:", data);
});

// 🛣️ Route updates (VERY IMPORTANT)
socket.on("route_updated", (data) => {
  console.log("🛣️ Route Updated:");
  console.log("Distance:", data.route?.distance);
  console.log("Duration:", data.route?.duration);
});

// 🚧 Incident updates
socket.on("incident_added", (data) => {
  console.log("⚠️ New Incident:", data);
});

// 🚓 Police updates
socket.on("police_update", (data) => {
  console.log("🚓 Police Update:", data);
});