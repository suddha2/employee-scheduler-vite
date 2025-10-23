export  const shiftTypes = ["LONG_DAY", "DAY", "WAKING_NIGHT", "FLOATING"];
export  const shiftTypeShortText = ["LD", "DY", "WN", "FL"];
export  const shiftColors = {
    LONG_DAY: 20, // "#FFB74D", // Morning - orange
    DAY: 30, //"#64B5F6", // Afternoon - blue
    WAKING_NIGHT: 10, //"#9575CD", // Evening - purple
    FLOATING: 70,//"#206c92ff", // Night - grey
};

export function getPriorityColor(priority) {
  // priority: 0 (low) → 100 (high)
  const clamped = Math.max(0, Math.min(priority, 100));
  const green = Math.round((clamped / 100) * 255);
  return `rgb(255, ${green}, 0)`; // red → yellow
}