import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { dirname } from 'node:path';

const sources = [
  ['.reconstruct/App.tsx.gz.b64', 'src/App.tsx', '7bd0d1e65bf90b68aa8d2e6f9733fd3bbd27c113f4f9f21a6db107fc7187442c'],
  ['.reconstruct/index.ts.gz.b64', 'src/index.ts', 'd6e68a9ee163f62a55ac607b7a97fca2e50cffd5e916f46c984be6b19892494c'],
  ['.reconstruct/globals.css.gz.b64', 'src/styles/globals.css', '52c0323fb4ff1c85ce322f9dd4a254a84da60583afb65b77852e19806133ba4b'],
];

for (const [source, destination, expectedSha] of sources) {
  const encoded = readFileSync(source, 'utf8').trim();
  const output = gunzipSync(Buffer.from(encoded, 'base64'));
  const actualSha = createHash('sha256').update(output).digest('hex');
  if (actualSha !== expectedSha) {
    throw new Error(`Source checksum mismatch for ${source}: ${actualSha}`);
  }
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, output);
  console.log(`restored ${destination} (${output.length} bytes)`);
}
