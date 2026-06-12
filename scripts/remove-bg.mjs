import { Jimp } from "jimp";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INPUT = path.resolve(__dirname, "../src/assets/logo/logo-hero.png");

const img = await Jimp.read(INPUT);
const { data, width, height } = img.bitmap;

// Reset alpha to fully opaque before processing
for (let i = 3; i < data.length; i += 4) data[i] = 255;

function isBackground(idx) {
  const r = data[idx], g = data[idx + 1], b = data[idx + 2];
  return r > 200 && g > 200 && b > 200; // near-white
}

// BFS flood-fill a partir das bordas — só remove branco conectado à borda
const visited = new Uint8Array(width * height);
const queue = [];

function seed(x, y) {
  const i = y * width + x;
  if (!visited[i] && isBackground(i * 4)) {
    visited[i] = 1;
    queue.push(i);
  }
}

for (let x = 0; x < width; x++) { seed(x, 0); seed(x, height - 1); }
for (let y = 0; y < height; y++) { seed(0, y); seed(width - 1, y); }

while (queue.length > 0) {
  const i = queue.pop();
  const x = i % width, y = Math.floor(i / width);

  // Transição suave: mais branco = mais transparente
  const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
  const minC = Math.min(r, g, b);
  data[i * 4 + 3] = minC < 220 ? Math.round(255 * (1 - (minC - 200) / 20)) : 0;

  const neighbors = [
    y > 0          ? i - width : -1,
    y < height - 1 ? i + width : -1,
    x > 0          ? i - 1     : -1,
    x < width - 1  ? i + 1     : -1,
  ];
  for (const n of neighbors) {
    if (n >= 0 && !visited[n] && isBackground(n * 4)) {
      visited[n] = 1;
      queue.push(n);
    }
  }
}

await img.write(INPUT);
console.log("Done — background removed via flood-fill");
