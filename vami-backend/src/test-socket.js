import { io } from "socket.io-client";

const URL = "http://localhost:5000";

// ⚠️ Pass your token as an environment variable:
//   TOKEN=eyJ... node src/test-socket.js
const YOUR_REAL_TOKEN = process.env.TOKEN;

if (!YOUR_REAL_TOKEN) {
  console.error(
    "❌ No token provided. Run with: TOKEN=<your_jwt> node src/test-socket.js",
  );
  process.exit(1);
}

console.log("--- Starting Tests ---");

// TEST 1: Bad Connection (No Token)
const badSocket = io(URL, {
  auth: { token: null },
  transports: ["websocket"],
});

badSocket.on("connect_error", (err) => {
  console.log(`\n[TEST 1] ✅ PASSED: Blocked unauthenticated user.`);
  console.log(`Reason: ${err.message}`);
  badSocket.close();

  // Only run Test 2 after Test 1 is done
  runAuthenticatedTest();
});

// TEST 2: Good Connection (With Token)
function runAuthenticatedTest() {
  console.log("\n--- Running Test 2 (Authenticated) ---");

  const goodSocket = io(URL, {
    auth: { token: YOUR_REAL_TOKEN },
    transports: ["websocket"],
  });

  goodSocket.on("connect", () => {
    console.log(`[TEST 2] ✅ PASSED: User connected successfully!`);
    console.log(`Socket ID: ${goodSocket.id}`);
    goodSocket.disconnect();
  });

  goodSocket.on("connect_error", (err) => {
    console.log(`[TEST 2] ❌ FAILED: Could not connect with token.`);
    console.log(`Error: ${err.message}`);
    goodSocket.disconnect();
  });
}
