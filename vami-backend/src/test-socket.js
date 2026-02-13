import { io } from "socket.io-client";

const URL = "http://localhost:5000"; // Make sure this matches your server port

// PASTE YOUR TOKEN HERE
const YOUR_REAL_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5OGVjZGMzZmE1ODM2ZDQ3NGNhZTVhNCIsImlhdCI6MTc3MDk2NjQ2NywiZXhwIjoxNzcxNTcxMjY3fQ.PU7nu5HbM8VDvW16dr3zfQPTHMCy_j08D4tGsRLT1MM";
console.log("--- Starting Tests ---");

// TEST 1: Bad Connection (No Token)
const badSocket = io(URL, {
  auth: { token: null },
  transports: ["websocket"], // Force websocket to fail faster if blocked
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
    goodSocket.disconnect(); // Clean exit
  });

  goodSocket.on("connect_error", (err) => {
    console.log(`[TEST 2] ❌ FAILED: Could not connect with token.`);
    console.log(`Error: ${err.message}`);
    goodSocket.disconnect();
  });
}
