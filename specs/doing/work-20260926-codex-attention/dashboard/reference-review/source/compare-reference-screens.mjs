import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const [dependencyDirectory, inventoryFile, screenName, size, actualFile, differenceFile] = process.argv.slice(2);
if (!differenceFile) {
  throw new Error('Expected dependency directory, inventory JSON, screen name, pixel size, actual PNG and difference PNG paths');
}
const requireFromCheckout = createRequire(path.resolve(dependencyDirectory, 'package.json'));
const { PNG } = requireFromCheckout('pngjs');
const pixelmatch = requireFromCheckout('pixelmatch');
const inventory = JSON.parse(fs.readFileSync(inventoryFile, 'utf8'));
const reference = inventory.find(entry => entry.screen === screenName && entry.size === size);
if (!reference) {
  throw new Error('Reference Screen and pixel size must match a row in the inventory');
}
const referenceFile = path.resolve(path.dirname(inventoryFile), reference.file);
const expected = PNG.sync.read(fs.readFileSync(referenceFile));
const actual = PNG.sync.read(fs.readFileSync(actualFile));
const [widthPx, heightPx] = size.split('x').map(Number);
if (expected.width !== widthPx || expected.height !== heightPx
    || actual.width !== widthPx || actual.height !== heightPx) {
  throw new Error(`Both PNGs must have the declared ${widthPx}x${heightPx} pixel dimensions`);
}
const allowedMaskKinds = new Set(['project', 'wait', 'native-id']);
for (const mask of reference.masks) {
  if (!allowedMaskKinds.has(mask.kind)
      || ![mask.x, mask.y, mask.width, mask.height].every(Number.isInteger)
      || mask.x < 0 || mask.y < 0 || mask.width <= 0 || mask.height <= 0
      || mask.x + mask.width > widthPx || mask.y + mask.height > heightPx) {
    throw new Error('Each mask must cover an allowed private field within the declared PNG bounds');
  }
  for (let yPx = mask.y; yPx < mask.y + mask.height; yPx++) {
    for (let xPx = mask.x; xPx < mask.x + mask.width; xPx++) {
      const byteOffset = (yPx * widthPx + xPx) * 4;
      expected.data.fill(0, byteOffset, byteOffset + 3);
      actual.data.fill(0, byteOffset, byteOffset + 3);
      expected.data[byteOffset + 3] = 255;
      actual.data[byteOffset + 3] = 255;
    }
  }
}
const difference = new PNG({ width: widthPx, height: heightPx });
const differentPixelCount = pixelmatch(expected.data, actual.data, difference.data,
  widthPx, heightPx, { threshold: 0.1, includeAA: false });
fs.writeFileSync(differenceFile, PNG.sync.write(difference));
process.stdout.write(JSON.stringify({ screen: screenName, size, differentPixelCount,
  maskCount: reference.masks.length, isMatch: differentPixelCount === 0 }) + '\n');
process.exitCode = differentPixelCount === 0 ? 0 : 1;
