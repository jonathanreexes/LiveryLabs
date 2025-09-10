const express = require("express");
const { Client, GatewayIntentBits } = require("discord.js");

// ---------- Health server (for Koyeb) ----------
const app = express();
app.get("/", (_req, res) => res.status(200).send("ok"));
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`[BOOT] Health server on :${PORT}`));

// ---------- Discord client with loud logging ----------
const client = new Client({
  intents: [GatewayIntentBits.Guilds], // enough to login
});

const token = process.env.DISCORD_TOKEN;

if (!token) {
  console.error("[ERROR] DISCORD_TOKEN env var is missing.");
  process.exit(1);
}

console.log(`[BOOT] DISCORD_TOKEN present: YES (value hidden)`);
console.log("[BOOT] Attempting client.login(...)");

// Log every major lifecycle/error we can catch
client.once("ready", () => {
  console.log(`[DISCORD] Logged in as ${client.user.tag}`);
});
client.on("error", (e) => console.error("[DISCORD] client error:", e));
client.on("shardError", (e) => console.error("[DISCORD] shard error:", e));
process.on("unhandledRejection", (reason) => {
  console.error("[NODE] Unhandled Rejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[NODE] Uncaught Exception:", err);
});

// Safety: if not logged in after 20s, warn
setTimeout(() => {
  if (!client.user) {
    console.error("[WARN] Still not logged in after 20s. Check token/permissions/network.");
  }
}, 20000);

client.login(token).catch((e) => {
  console.error("[DISCORD] login() threw:", e);
  // Don't exit immediately; leave logs visible
});
