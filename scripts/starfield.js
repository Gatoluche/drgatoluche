// Starfield module — sizes and places the rotating star canvas relative to the viewport pivot.
const starLayers = Array.from(document.querySelectorAll(".stars"));

const updateStarCanvasGeometry = () => {
  if (starLayers.length === 0) {
    return;
  }

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // Keep the sky-dome pivot below the visible screen for Earth-like perspective.
  const pivotX = viewportWidth * 0.5;
  const pivotY = viewportHeight * 1.38;

  const corners = [
    [0, 0],
    [viewportWidth, 0],
    [0, viewportHeight],
    [viewportWidth, viewportHeight]
  ];

  // Radius needed so every viewport corner stays inside the rotating square.
  const requiredRadius = corners.reduce((maxDistance, [x, y]) => {
    const distance = Math.hypot(x - pivotX, y - pivotY);
    return Math.max(maxDistance, distance);
  }, 0);

  const canvasSize = Math.ceil(requiredRadius * 2 + 4);

  document.documentElement.style.setProperty("--star-canvas-size", `${canvasSize}px`);
  document.documentElement.style.setProperty("--star-pivot-x", `${pivotX}px`);
  document.documentElement.style.setProperty("--star-pivot-y", `${pivotY}px`);
};

updateStarCanvasGeometry();
window.addEventListener("resize", updateStarCanvasGeometry);
