import express from "express";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = process.env.DATA_FILE || "./data.json";
const ADMIN_KEY = process.env.ADMIN_KEY;

app.use(express.json());
app.use(express.static("public"));

const participants = ["Kaith", "Molly", "Tom", "Shin", "Mark", "Dad", "Mum"];

function createDraw() {
  let recipients;
  do {
    recipients = [...participants];
    for (let i = recipients.length - 1; i > 0; i--) {
      const j = crypto.randomInt(i + 1);
      [recipients[i], recipients[j]] = [recipients[j], recipients[i]];
    }
  } while (recipients.some((name, i) => name === participants[i]));

  return {
    entries: participants.map((name, i) => ({
      name,
      recipient: recipients[i],
      token: crypto.randomBytes(24).toString("hex")
    }))
  };
}

let draw;
if (fs.existsSync(DATA_FILE)) {
  draw = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
} else {
  draw = createDraw();
  fs.writeFileSync(DATA_FILE, JSON.stringify(draw), { mode: 0o600 });
}

app.get("/api/reveal/:token", (req, res) => {
  const entry = draw.entries.find(x => x.token === req.params.token);
  if (!entry) return res.status(404).json({ error: "Invalid private link." });

  res.set("Cache-Control", "no-store");
  res.json({ name: entry.name, recipient: entry.recipient });
});

app.get("/api/links", (req, res) => {
  if (!ADMIN_KEY || req.get("x-admin-key") !== ADMIN_KEY)
    return res.status(401).json({ error: "Unauthorized" });

  const origin = `${req.protocol}://${req.get("host")}`;
  res.set("Cache-Control", "no-store");
  res.json(draw.entries.map(({ name, token }) => ({
    name,
    link: `${origin}/?token=${token}`
  })));
});

app.get("*", (req, res) =>
  res.sendFile(path.resolve("public/index.html"))
);

app.listen(PORT, () => console.log("Secret Santa is running!"));
