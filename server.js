import express from "express";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY;

if (!ADMIN_KEY) {
  throw new Error("ADMIN_KEY environment variable is required.");
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const participants = ["Kaith", "Molly", "Tom", "Shin", "Mark", "Dad", "Mum"];

function hash(value) {
  return crypto
    .createHmac("sha256", ADMIN_KEY)
    .update(value)
    .digest("hex");
}

// A secret-key-based ordering creates a stable draw.
// Assigning the next person in a circular order prevents self-assignments.
const ordered = [...participants].sort((a, b) =>
  hash("draw:" + a).localeCompare(hash("draw:" + b))
);

const entries = ordered.map((name, index) => {
  const recipient = ordered[(index + 1) % ordered.length];

  return {
    name,
    recipient,
    token: hash("link:" + name)
  };
});

app.use(express.static(path.join(__dirname, "public")));

app.get("/api/reveal/:token", (req, res) => {
  const entry = entries.find(
    item => item.token === req.params.token
  );

  if (!entry) {
    return res.status(404).json({ error: "Invalid private link." });
  }

  res.set("Cache-Control", "no-store");
  res.json({
    name: entry.name,
    recipient: entry.recipient
  });
});

app.get("/api/links", (req, res) => {
  if (req.get("x-admin-key") !== ADMIN_KEY) {
    return res.status(401).json({ error: "Unauthorized." });
  }

  const origin = `${req.protocol}://${req.get("host")}`;

  res.set("Cache-Control", "no-store");

  res.json(entries.map(({ name, token }) => ({
    name,
    link: `${origin}/?token=${token}`
  })));
});

app.listen(PORT, () => {
  console.log("Secret Santa 2026 is running!");
});
