/**
 * Progress Bar Component
 *
 * Animated token usage progress bar with colour-coded states.
 */

export function renderProgressBar(
  percent: number,
  used: number,
  max: number
): string {
  const colour = getProgressColour(percent);
  const widthPercent = Math.min(100, Math.max(0, percent));

  return `
    <div
      class="progress-bar-container"
      role="progressbar"
      aria-valuenow="${widthPercent}"
      aria-valuemin="0"
      aria-valuemax="100"
      aria-label="Context usage: ${widthPercent.toFixed(1)}%"
    >
      <div
        class="progress-bar-fill ${getProgressClass(percent)}"
        style="width: ${widthPercent}%; background-color: ${colour};"
        data-percent="${widthPercent}"
      >
        ${percent >= 90 ? '<div class="progress-glow"></div>' : ''}
      </div>
    </div>
  `;
}

function getProgressColour(percent: number): string {
  // Colour-coded by usage percentage
  if (percent >= 95) return '#ef4444'; // red - critical
  if (percent >= 80) return '#f97316'; // orange - warning
  if (percent >= 60) return '#eab308'; // yellow - moderate
  return '#22c55e'; // green - healthy
}

function getProgressClass(percent: number): string {
  if (percent >= 95) return 'critical pulse';
  if (percent >= 80) return 'warning';
  if (percent >= 60) return 'moderate';
  return 'healthy';
}
