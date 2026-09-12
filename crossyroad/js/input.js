// Keyboard (arrows/WASD) and on-screen touch button input.
// Calls onMove(dRow, dCol) whenever the player requests a hop.

const KEY_MAP = {
  ArrowUp: [1, 0], KeyW: [1, 0],
  ArrowDown: [-1, 0], KeyS: [-1, 0],
  ArrowLeft: [0, -1], KeyA: [0, -1],
  ArrowRight: [0, 1], KeyD: [0, 1],
};

export function setupInput(onMove, onStart) {
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'Enter') {
      onStart();
      return;
    }
    const dir = KEY_MAP[e.code];
    if (dir) {
      e.preventDefault();
      onMove(dir[0], dir[1]);
    }
  });

  const bind = (id, dRow, dCol) => {
    const el = document.getElementById(id);
    if (!el) return;
    const trigger = (e) => {
      e.preventDefault();
      onMove(dRow, dCol);
    };
    el.addEventListener('pointerdown', trigger);
    el.style.touchAction = 'none';
  };
  bind('btn-up', 1, 0);
  bind('btn-down', -1, 0);
  bind('btn-left', 0, -1);
  bind('btn-right', 0, 1);

  // Simple swipe support on the canvas itself.
  let touchStart = null;
  const canvas = document.getElementById('game-canvas');
  canvas.addEventListener('touchstart', (e) => {
    const t = e.changedTouches[0];
    touchStart = { x: t.clientX, y: t.clientY };
  }, { passive: true });
  canvas.addEventListener('touchend', (e) => {
    if (!touchStart) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    touchStart = null;
    const threshold = 24;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < threshold) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      onMove(0, dx > 0 ? 1 : -1);
    } else {
      onMove(dy < 0 ? 1 : -1, 0);
    }
  }, { passive: true });
}
