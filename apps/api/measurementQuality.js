const DEFAULT_QUALITY_OPTIONS = {
  absolute_deviation_cm: 55,
  mad_multiplier: 6,
  neighbor_window: 5,
  minimum_neighbors: 3,
  sustained_run_length: 3,
  sustained_run_tolerance_cm: 25,
};

function finite_number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function median(values) {
  const source = values
    .map(finite_number)
    .filter((value) => value !== null)
    .sort((a, b) => a - b);

  if (source.length === 0) return null;
  const middle = Math.floor(source.length / 2);
  return source.length % 2 ? source[middle] : (source[middle - 1] + source[middle]) / 2;
}

function median_absolute_deviation(values) {
  const center = median(values);
  if (center === null) return 0;
  return median(values.map((value) => Math.abs(Number(value) - center))) || 0;
}

function robust_standard_deviation(values) {
  return median_absolute_deviation(values) * 1.4826;
}

function measurement_time(row) {
  const timestamp = new Date(row && row.measured_at).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function analyze_measurements(rows, custom_options = {}) {
  const options = { ...DEFAULT_QUALITY_OPTIONS, ...custom_options };
  const sorted_rows = [...rows]
    .filter((row) => finite_number(row && row.water_level_cm) !== null)
    .sort((left, right) => measurement_time(left) - measurement_time(right));
  const analyses = [];
  const accepted_values = [];
  let index = 0;

  while (index < sorted_rows.length) {
    const row = sorted_rows[index];
    const value = Number(row.water_level_cm);
    const recent_values = accepted_values.slice(-options.neighbor_window);

    if (recent_values.length < options.minimum_neighbors) {
      analyses.push({ row, value, is_outlier: false, reason: null, baseline_cm: null, threshold_cm: null });
      accepted_values.push(value);
      index += 1;
      continue;
    }

    const baseline_cm = median(recent_values);
    const robust_spread_cm = robust_standard_deviation(recent_values);
    const threshold_cm = Math.max(
      options.absolute_deviation_cm,
      robust_spread_cm * options.mad_multiplier
    );

    if (Math.abs(value - baseline_cm) < threshold_cm) {
      analyses.push({ row, value, is_outlier: false, reason: null, baseline_cm, threshold_cm });
      accepted_values.push(value);
      index += 1;
      continue;
    }

    const sustained_rows = [];
    let run_index = index;
    let run_min = value;
    let run_max = value;

    while (run_index < sorted_rows.length) {
      const run_row = sorted_rows[run_index];
      const run_value = Number(run_row.water_level_cm);
      run_min = Math.min(run_min, run_value);
      run_max = Math.max(run_max, run_value);

      if (
        Math.abs(run_value - baseline_cm) < threshold_cm ||
        run_max - run_min > options.sustained_run_tolerance_cm
      ) {
        break;
      }

      sustained_rows.push({ row: run_row, value: run_value });
      run_index += 1;
    }

    if (sustained_rows.length >= options.sustained_run_length) {
      for (const item of sustained_rows) {
        analyses.push({
          ...item,
          is_outlier: false,
          reason: null,
          baseline_cm,
          threshold_cm,
        });
        accepted_values.push(item.value);
      }
      index = run_index;
      continue;
    }

    analyses.push({
      row,
      value,
      is_outlier: true,
      reason: "isolated_level_deviation",
      baseline_cm,
      threshold_cm,
    });
    index += 1;
  }

  return {
    accepted: analyses.filter((item) => !item.is_outlier).map((item) => item.row),
    rejected: analyses.filter((item) => item.is_outlier).map((item) => ({
      ...item.row,
      quality_reason: item.reason,
      quality_baseline_cm: Number(item.baseline_cm.toFixed(2)),
    })),
    analyses,
  };
}

function aggregate_measurements(rows, bucket_minutes = 15) {
  const bucket_ms = Math.max(Number(bucket_minutes) || 15, 1) * 60 * 1000;
  const buckets = new Map();

  for (const row of rows) {
    const time = measurement_time(row);
    const value = finite_number(row && row.water_level_cm);
    if (!time || value === null) continue;

    const key = Math.floor(time / bucket_ms);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push({ row, time, value });
  }

  return [...buckets.values()]
    .map((items) => {
      const measured_at_ms = median(items.map((item) => item.time));
      return {
        ...items[items.length - 1].row,
        water_level_cm: median(items.map((item) => item.value)),
        measured_at: new Date(measured_at_ms).toISOString(),
        aggregated_measurement_count: items.length,
      };
    })
    .sort((left, right) => measurement_time(left) - measurement_time(right));
}

module.exports = {
  DEFAULT_QUALITY_OPTIONS,
  aggregate_measurements,
  analyze_measurements,
  median_absolute_deviation,
  robust_standard_deviation,
};
