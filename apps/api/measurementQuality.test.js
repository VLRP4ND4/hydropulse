const test = require("node:test");
const assert = require("node:assert/strict");
const {
  aggregate_measurements,
  analyze_measurements,
  robust_standard_deviation,
} = require("./measurementQuality");

function rows(values, start = "2026-07-15T00:00:00.000Z", step_minutes = 60) {
  const start_ms = new Date(start).getTime();
  return values.map((water_level_cm, index) => ({
    id: index + 1,
    water_level_cm,
    measured_at: new Date(start_ms + index * step_minutes * 60 * 1000).toISOString(),
  }));
}

test("removes isolated drops around 300-400 cm from a stable 480 cm series", () => {
  const source = rows([479, 481, 480, 400, 482, 478, 320, 481, 480]);
  const result = analyze_measurements(source);

  assert.deepEqual(result.rejected.map((item) => item.water_level_cm), [400, 320]);
  assert.deepEqual(result.accepted.map((item) => item.water_level_cm), [479, 481, 480, 482, 478, 481, 480]);
});

test("keeps normal sensor noise", () => {
  const source = rows([477, 480, 483, 479, 485, 481, 476, 482]);
  const result = analyze_measurements(source);

  assert.equal(result.rejected.length, 0);
  assert.equal(result.accepted.length, source.length);
});

test("keeps a sustained new level after three consistent measurements", () => {
  const source = rows([480, 481, 479, 480, 600, 602, 601]);
  const result = analyze_measurements(source);

  assert.deepEqual(result.accepted.slice(-3).map((item) => item.water_level_cm), [600, 602, 601]);
});

test("rejects a single anomalous latest measurement", () => {
  const source = rows([480, 481, 479, 482, 480, 390]);
  const result = analyze_measurements(source);

  assert.deepEqual(result.rejected.map((item) => item.water_level_cm), [390]);
  assert.equal(result.accepted.at(-1).water_level_cm, 480);
});

test("aggregates frequent measurements by median", () => {
  const source = rows([480, 481, 479, 600, 482, 480], "2026-07-15T00:00:00.000Z", 2);
  const result = aggregate_measurements(source, 15);

  assert.equal(result.length, 1);
  assert.equal(result[0].water_level_cm, 480.5);
  assert.equal(result[0].aggregated_measurement_count, 6);
});

test("robust spread is not inflated by one extreme velocity", () => {
  const spread = robust_standard_deviation([0.2, -0.1, 0.3, 0.1, 12000]);
  assert.ok(spread < 1);
});
