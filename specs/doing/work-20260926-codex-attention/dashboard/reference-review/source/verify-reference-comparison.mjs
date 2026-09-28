import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const [dependencyDirectory, reviewDirectory] = process.argv.slice(2);
const requireFromCheckout = createRequire(path.resolve(dependencyDirectory, 'package.json'));
const { PNG } = requireFromCheckout('pngjs');
const inventoryFile = path.join(reviewDirectory, 'screen-inventory.json');
const inventory = JSON.parse(fs.readFileSync(inventoryFile, 'utf8'));
const evidenceDirectory = path.join(reviewDirectory, 'comparison-evidence');
fs.mkdirSync(evidenceDirectory, { recursive: true });
const comparator = path.join(reviewDirectory, 'source/compare-reference-screens.mjs');
for (const reference of inventory) {
  const actualFile = path.join(reviewDirectory, reference.file);
  const differenceFile = path.join(evidenceDirectory, `${reference.screen}-${reference.size}-identical.png`);
  const result = spawnSync(process.execPath, [comparator, dependencyDirectory, inventoryFile,
    reference.screen, reference.size, actualFile, differenceFile], { encoding: 'utf8' });
  assert.equal(result.status, 0, 'An identical fixed-size reference must pass comparison');
}
const reference = inventory.find(entry => entry.screen === 'ccmux-attention-compact' && entry.size === '640x360');
const image = PNG.sync.read(fs.readFileSync(path.join(reviewDirectory, reference.file)));
for (let yPx = 60; yPx < 100; yPx++) {
  for (let xPx = 0; xPx < image.width; xPx++) {
    const byteOffset = (yPx * image.width + xPx) * 4;
    image.data[byteOffset] = 20;
    image.data[byteOffset + 1] = 25;
    image.data[byteOffset + 2] = 31;
    image.data[byteOffset + 3] = 255;
  }
}
const removedCoverageFile = path.join(evidenceDirectory, 'coverage-removed.png');
fs.writeFileSync(removedCoverageFile, PNG.sync.write(image));
const result = spawnSync(process.execPath, [comparator, dependencyDirectory, inventoryFile,
  reference.screen, reference.size, removedCoverageFile,
  path.join(evidenceDirectory, 'coverage-removed-difference.png')], { encoding: 'utf8' });
assert.equal(result.status, 1, 'Deleting unmasked coverage must fail the comparison');
const coverageComparison = JSON.parse(result.stdout);
process.stdout.write(JSON.stringify({ passedReferenceControlCount: inventory.length,
  isCoverageDeletionRejected: true, coverageDifferentPixelCount: coverageComparison.differentPixelCount,
  scope: 'Static comparison helper only; no production UI or acceptance result' }) + '\n');
