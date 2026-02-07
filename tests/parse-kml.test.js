/**
 * 基礎單元測試：parse-kml 產出結構
 */
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseKmlFiles, getDefaultKmlPaths } from '../scripts/parse-kml.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturePath = join(__dirname, 'fixtures', 'minimal.kml');

describe('parseKmlFiles', () => {
  it('returns array of places with required keys', () => {
    if (!existsSync(fixturePath)) {
      console.log('skip: fixture minimal.kml not found');
      return;
    }
    const places = parseKmlFiles([fixturePath]);
    assert.ok(Array.isArray(places));
    if (places.length > 0) {
      const p = places[0];
      assert.ok('id' in p);
      assert.ok('name' in p);
      assert.ok('category' in p);
      assert.ok('googleMapsUrl' in p);
    }
  });

  it('parses place name and Google Maps URL from fixture', () => {
    if (!existsSync(fixturePath)) return;
    const places = parseKmlFiles([fixturePath]);
    assert.ok(places.length >= 1);
    assert.strictEqual(places[0].name, '測試地點');
    assert.ok(places[0].googleMapsUrl && places[0].googleMapsUrl.includes('google.com'));
  });
});

describe('getDefaultKmlPaths', () => {
  it('returns array including 地圖_1 and 地圖_2 and 地圖.kml', () => {
    const paths = getDefaultKmlPaths('C:\\TH');
    assert.ok(Array.isArray(paths));
    assert.ok(paths.some((p) => p.includes('地圖_1_基礎.kml')));
    assert.ok(paths.some((p) => p.includes('地圖_2_三條路線.kml')));
    assert.ok(paths.some((p) => p.includes('曼谷成人行程_地圖.kml')));
  });
});
