import { range, riverPositions, riverMotion } from './geometry.mjs';
import { projectedWidth } from './gathering-geometry.mjs';

export function createClosure(river, copy) {
  const footer = document.querySelector('.closure');
  const divider = document.querySelector('.stream-divider');
  const path = divider.querySelector('path');
  const status = footer.querySelector('.closure-status');
  const privacy = footer.querySelector('.privacy-note');
  let width = 0, height = 0, axisY = 0, lineY = 0, contentTop = 0;
  let progress = 0, reduced = false, seconds = 0, packets = [], disturbances = new WeakMap(), next = new WeakMap();
  function trigger(card, x, strong = false, ambient = false) {
    if (progress < .9) return;
    if (!reduced) {
      disturbances.set(card, { at: seconds, strength: strong ? 5 : ambient ? .6 : 2 });
      if (!ambient || Math.random() < .35) packets.push({ x, at: seconds + (strong ? 0 : ambient ? 1.2 : .4), strength: strong ? 3 : ambient ? .35 : 1.3 });
      packets = packets.slice(-4);
    }
    if (!ambient) status.textContent = strong ? copy.rippleActive : copy.rippleQuiet;
  }
  river.addEventListener('pointerover', event => {
    const card = event.target.closest('figure[data-residual]');
    if (card && !card.contains(event.relatedTarget)) {
      const box = card.getBoundingClientRect(); trigger(card, box.x + box.width / 2);
    }
  });
  river.addEventListener('pointermove', event => {
    if (event.pointerType !== 'touch') return;
    const card = event.target.closest('figure[data-residual]');
    if (card && (!disturbances.has(card) || seconds - disturbances.get(card).at > 1)) trigger(card, event.clientX);
  }, { passive: true });
  function activate(event) {
    const card = event.target.closest('figure[data-residual]');
    if (!card || event.type === 'keydown' && !['Enter', ' '].includes(event.key)) return;
    if (event.type === 'keydown') event.preventDefault();
    const box = card.getBoundingClientRect(); trigger(card, box.x + box.width / 2, true);
  }
  river.addEventListener('click', activate);
  river.addEventListener('keydown', activate);
  return {
    get interactive() { return progress >= .9; },
    measure(nextWidth, nextHeight, nextAxisY) {
      width = nextWidth; height = nextHeight; axisY = nextAxisY;
      const wasHidden = footer.hidden;
      footer.hidden = false;
      const content = footer.querySelector('.closure-copy');
      contentTop = content.offsetTop;
      lineY = footer.querySelector('.closure-legal').offsetTop - 18;
      footer.hidden = wasHidden;
    },
    flow(photos) {
      const elapsed = progress >= .9 && !reduced ? seconds : 0;
      const available = Math.max(24, contentTop - 40);
      const cards = photos.map((photo, index) => {
        const extent = Math.max(...[-.6, .6].map(sway => projectedWidth(photo.height, photo.width, photo.angle + sway)));
        const scale = Math.min(1, available * .8 / extent);
        const motion = riverMotion(elapsed, index, photos.length);
        return { scale, angle: photo.angle + motion.sway,
          width: projectedWidth(photo.width, photo.height, photo.angle, scale),
          y: 16 + extent * scale / 2 + index * height * .008 + motion.bob * photo.height * scale };
      });
      const centers = riverPositions(width, cards.map(card => card.width), elapsed, -width * .05 + (cards[0]?.width ?? 170) / 2);
      return cards.map((card, index) => ({ ...card, x: centers[index] }));
    },
    update(value, width, height, dt, nextReduced) {
      reduced = nextReduced;
      if (value < .9 && progress >= .9) { seconds = 0; packets = []; disturbances = new WeakMap(); next = new WeakMap(); }
      progress = value;
      footer.style.opacity = String(range(value, .65, .95));
      footer.inert = value < .9;
      if (value < .9 && privacy.hidePopover && privacy.matches(':popover-open')) privacy.hidePopover();
      footer.hidden = value === 0;
      footer.style.visibility = value === 0 ? 'hidden' : 'visible';
      divider.toggleAttribute('hidden', value === 0);
      if (value === 0) return;
      divider.style.opacity = String(range(value, .08, .3));
      divider.style.top = `${axisY + (lineY - axisY) * range(value, .3, .8)}px`;
      divider.setAttribute('viewBox', `0 -12 ${width} 24`);
      if (value >= .9 && !reduced) seconds += dt / 1000;
      packets = packets.filter(packet => seconds - packet.at < 4.5);
      const points = [];
      for (let x = 0; x <= width + 4; x += 4) {
        let y = reduced ? 0 : Math.sin(x / Math.max(1, width) * Math.PI * 2) * 2 * range(value, .3, 1);
        if (!reduced) for (const packet of packets) {
          const age = seconds - packet.at;
          if (age < 0) continue;
          const distance = x - packet.x;
          y += Math.sin(distance / 48 - age * 5) * Math.exp(-distance * distance / (2 * 115 ** 2))
            * Math.sin(Math.min(1, age * 4) * Math.PI / 2) * Math.exp(-age * .85) * packet.strength;
        }
        points.push(`${x === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(3)}`);
      }
      path.setAttribute('d', points.join(' '));
    },
    residual(card, x) {
      if (progress >= .9 && !reduced && !next.has(card)) next.set(card, seconds + 2 + Math.random() * 2);
      if (progress >= .9 && !reduced && seconds >= next.get(card)) {
        next.set(card, seconds + 2 + Math.random() * 2);
        trigger(card, x, false, true);
      }
      const event = disturbances.get(card), age = event ? seconds - event.at : 10;
      return progress >= .9 && !reduced && age < 2
        ? Math.sin(age * 7) * Math.exp(-age * 2) * event.strength : 0;
    },
  };
}
