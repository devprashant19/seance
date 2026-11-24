import type { TeamResult } from "./stats.js";

/**
 * Generates RFC 4180 compliant CSV export for classroom results.
 */
export function generateCircleCsv(
  results: readonly TeamResult[],
  experimentId: string,
  unit: string,
): string {
  const lines: string[] = [
    `# Séance Circle Classroom Data - Experiment: ${experimentId}`,
    `Team,Station,Value,Uncertainty,Unit,Timestamp,Notes`,
  ];

  for (const r of results) {
    const station = r.station ?? "Station 1";
    const isoDate = new Date(r.timestamp).toISOString();
    const notes = (r.notes ?? "").replace(/"/g, '""');
    const teamEscaped = r.teamName.replace(/"/g, '""');

    lines.push(
      `"${teamEscaped}","${station}",${r.value},${r.uncertainty},"${unit}","${isoDate}","${notes}"`,
    );
  }

  return lines.join("\n");
}

/**
 * Generates an executable Jupyter Notebook JSON with Python error analysis and plotting code.
 */
export function generateCircleNotebook(
  results: readonly TeamResult[],
  experimentId: string,
  unit: string,
): string {
  const dataPython = results.map((r) => ({
    team: r.teamName,
    value: r.value,
    uncertainty: r.uncertainty,
    station: r.station ?? "Station 1",
  }));

  const notebook = {
    cells: [
      {
        cell_type: "markdown",
        metadata: {},
        source: [
          `# Séance Circle Analysis: ${experimentId}\n`,
          `This notebook analyzes classroom measurements collected across student lab teams with individual physical uncertainties.\n`,
        ],
      },
      {
        cell_type: "code",
        execution_count: null,
        metadata: {},
        outputs: [],
        source: [
          `import numpy as np\n`,
          `import matplotlib.pyplot as plt\n`,
          `\n`,
          `# Data collected from Séance Circle\n`,
          `data = ${JSON.stringify(dataPython, null, 2)}\n`,
          `\n`,
          `teams = [d['team'] for d in data]\n`,
          `values = np.array([d['value'] for d in data])\n`,
          `uncertainties = np.array([d['uncertainty'] for d in data])\n`,
          `\n`,
          `# 1. Summary Statistics\n`,
          `mean_val = np.mean(values)\n`,
          `std_val = np.std(values, ddof=1) if len(values) > 1 else 0.0\n`,
          `median_val = np.median(values)\n`,
          `mad_val = np.median(np.abs(values - median_val))\n`,
          `\n`,
          `# 2. Inverse-Variance Weighted Mean\n`,
          `weights = 1.0 / (uncertainties ** 2)\n`,
          `weighted_mean = np.sum(weights * values) / np.sum(weights)\n`,
          `weighted_unc = 1.0 / np.sqrt(np.sum(weights))\n`,
          `\n`,
          `print(f"Sample Mean: {mean_val:.4f} ± {std_val:.4f} ${unit}")\n`,
          `print(f"Median:      {median_val:.4f} (MAD = {mad_val:.4f})")\n`,
          `print(f"Weighted:    {weighted_mean:.4f} ± {weighted_unc:.4f} ${unit}")\n`,
        ],
      },
      {
        cell_type: "code",
        execution_count: null,
        metadata: {},
        outputs: [],
        source: [
          `# 3. Plot Classroom Distribution with Uncertainty Bars\n`,
          `plt.figure(figsize=(10, 5))\n`,
          `x_indices = np.arange(len(teams))\n`,
          `plt.errorbar(x_indices, values, yerr=uncertainties, fmt='o', color='#3b82f6', ecolor='#60a5fa', capsize=4, label='Team Measurement')\n`,
          `plt.axhline(mean_val, color='#ef4444', linestyle='--', label=f'Mean ({mean_val:.3f})')\n`,
          `plt.axhline(weighted_mean, color='#10b981', linestyle='-', linewidth=2, label=f'Weighted Mean ({weighted_mean:.3f})')\n`,
          `plt.xticks(x_indices, teams, rotation=30, ha='right')\n`,
          `plt.ylabel(f"Measured Value (${unit})")\n`,
          `plt.title(f"Classroom Results: ${experimentId}")\n`,
          `plt.legend()\n`,
          `plt.grid(True, alpha=0.3)\n`,
          `plt.tight_layout()\n`,
          `plt.show()\n`,
        ],
      },
    ],
    metadata: {
      language_info: {
        name: "python",
      },
    },
    nbformat: 4,
    nbformat_minor: 2,
  };

  return JSON.stringify(notebook, null, 2);
}
