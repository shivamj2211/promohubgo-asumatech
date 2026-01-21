const fs = require("fs");

const inFile = "pincode_cleaned (1).json";
const outFile = "pincode_cleaned.csv";

if (!fs.existsSync(inFile)) {
  console.error("❌ JSON file not found:", inFile);
  process.exit(1);
}

const raw = fs.readFileSync(inFile, "utf-8");
const parsed = JSON.parse(raw);

let rows = [];
if (Array.isArray(parsed)) rows = parsed;
else if (Array.isArray(parsed.data)) rows = parsed.data;
else if (Array.isArray(parsed.offices)) rows = parsed.offices;
else {
  const vals = Object.values(parsed);
  if (vals.length && Array.isArray(vals[0])) rows = vals.flat();
}

if (!Array.isArray(rows) || rows.length === 0) {
  console.error("❌ JSON structure not supported");
  process.exit(1);
}

function esc(v) {
  const s = String(v ?? "");
  return `"${s.replaceAll('"', '""')}"`;
}

const header = ["officename","pincode","district","statename","latitude","longitude"];
const lines = [header.join(",")];

for (const o of rows) {
  lines.push([
    esc(o.officename ?? o.office ?? ""),
    esc(o.pincode ?? ""),
    esc(o.district ?? ""),
    esc(o.statename ?? o.state ?? ""),
    esc(o.latitude ?? ""),
    esc(o.longitude ?? ""),
  ].join(","));
}

fs.writeFileSync(outFile, lines.join("\n"), "utf-8");
console.log("✅ CSV created:", outFile, "| rows:", rows.length);
