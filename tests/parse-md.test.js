/**
 * 基礎單元測試：parse-md 產出結構
 */
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseItineraryMd } from '../scripts/parse-md.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturePath = join(__dirname, 'fixtures', 'minimal.md');

describe('parseItineraryMd', () => {
  it('returns object with required top-level keys', () => {
    if (!existsSync(fixturePath)) {
      console.log('skip: fixture minimal.md not found');
      return;
    }
    const result = parseItineraryMd(fixturePath);
    assert.strictEqual(typeof result, 'object');
    assert.ok('title' in result);
    assert.ok(Array.isArray(result.flights));
    assert.ok('hotel' in result);
    assert.ok(Array.isArray(result.reservedRestaurants));
    assert.ok(Array.isArray(result.days));
    assert.ok(result.routes && typeof result.routes === 'object');
    assert.ok(result.routes.A && result.routes.B && result.routes.C);
  });

  it('parses flights from table', () => {
    if (!existsSync(fixturePath)) return;
    const result = parseItineraryMd(fixturePath);
    assert.ok(result.flights.length >= 1);
    assert.strictEqual(result.flights[0].direction, '去程');
    assert.strictEqual(result.flights[0].flight, 'CX 001');
  });

  it('parses hotel name', () => {
    if (!existsSync(fixturePath)) return;
    const result = parseItineraryMd(fixturePath);
    assert.ok(result.hotel);
    assert.strictEqual(result.hotel.name, 'Test Hotel');
  });

  it('parses days with slots', () => {
    if (!existsSync(fixturePath)) return;
    const result = parseItineraryMd(fixturePath);
    assert.ok(result.days.length >= 1);
    const d = result.days.find((x) => x.day === 1);
    assert.ok(d);
    assert.ok(Array.isArray(d.slots));
    assert.ok(d.slots.length >= 1);
  });
});
