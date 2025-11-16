// Quick test to check if backend is accessible
// Run this with: node test-backend-connection.js

const http = require("http");

const options = {
  hostname: "10.218.218.93",
  port: 5000,
  path: "/api/users/login",
  method: "GET",
  timeout: 5000,
};

console.log("Testing connection to backend...");
console.log(`URL: http://${options.hostname}:${options.port}${options.path}`);

const req = http.request(options, (res) => {
  console.log("\n✅ SUCCESS! Backend is reachable!");
  console.log(`Status Code: ${res.statusCode}`);
  console.log("\nYour mobile device should be able to connect.");
  console.log("\nNext steps:");
  console.log("1. Make sure your phone is on the same WiFi");
  console.log("2. Run: cd app && npx expo start --clear");
  console.log("3. Scan the QR code with Expo Go");
});

req.on("error", (error) => {
  console.log("\n❌ ERROR! Cannot reach backend");
  console.log(`Error: ${error.message}`);
  console.log("\nPossible issues:");
  console.log(
    "1. Backend is not running (start with: cd backend && npm start)"
  );
  console.log("2. Windows Firewall is blocking port 5000");
  console.log("3. Wrong IP address (check with: ipconfig)");
  console.log("\nTo fix firewall issue:");
  console.log("Run PowerShell as Administrator and execute:");
  console.log(
    'New-NetFirewallRule -DisplayName "Node.js Major Backend" -Direction Inbound -LocalPort 5000 -Protocol TCP -Action Allow'
  );
});

req.on("timeout", () => {
  console.log("\n❌ TIMEOUT! Connection timed out");
  console.log(
    "This usually means Windows Firewall is blocking the connection."
  );
  req.destroy();
});

req.end();
