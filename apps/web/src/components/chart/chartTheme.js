function chart_theme(darkMode) {
  return {
    text: darkMode ? "#dbe7f5" : "#334155",
    muted: darkMode ? "#b9c8dc" : "#64748b",
    grid: darkMode ? "rgba(148, 163, 184, 0.16)" : "rgba(148, 163, 184, 0.22)",
    tooltipBg: darkMode ? "rgba(15, 23, 42, 0.94)" : "rgba(15, 23, 42, 0.9)",
    tooltipBorder: darkMode ? "rgba(148, 163, 184, 0.24)" : "rgba(15, 23, 42, 0.08)",
  };
}

function themed_scale(scale = {}, theme) {
  return {
    ...scale,
    grid: {
      color: theme.grid,
      ...(scale.grid || {}),
    },
    ticks: {
      color: theme.muted,
      ...(scale.ticks || {}),
    },
    title: scale.title
      ? {
          color: theme.muted,
          ...scale.title,
        }
      : scale.title,
  };
}

export function with_chart_theme(options, darkMode) {
  const theme = chart_theme(darkMode);
  const scales = options.scales || {};
  const themed_scales = {
    x: themed_scale(scales.x, theme),
    y: themed_scale(scales.y, theme),
  };

  Object.keys(scales).forEach((key) => {
    if (!themed_scales[key]) {
      themed_scales[key] = themed_scale(scales[key], theme);
    }
  });

  return {
    ...options,
    plugins: {
      ...(options.plugins || {}),
      legend: {
        ...((options.plugins && options.plugins.legend) || {}),
        labels: {
          color: theme.muted,
          boxWidth: 38,
          padding: 14,
          ...(((options.plugins && options.plugins.legend && options.plugins.legend.labels) || {})),
        },
      },
      tooltip: {
        backgroundColor: theme.tooltipBg,
        titleColor: "#f8fafc",
        bodyColor: "#f8fafc",
        borderColor: theme.tooltipBorder,
        borderWidth: 1,
        ...((options.plugins && options.plugins.tooltip) || {}),
      },
    },
    scales: themed_scales,
  };
}
