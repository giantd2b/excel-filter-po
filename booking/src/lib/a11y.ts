/**
 * Most tappable things in this app are styled <div onClick> (chips, cards, toggles). This makes
 * them usable from a keyboard and readable by screen readers without touching every component:
 *  - any element with an inline `cursor: pointer` that isn't already a link/button/input gets
 *    role="button" + tabindex="0"
 *  - Enter / Space on a role="button" element clicks it
 */
const NATIVE = new Set(['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'SUMMARY', 'LABEL']);

function upgrade(root: ParentNode) {
  root.querySelectorAll<HTMLElement>('[style*="cursor: pointer"]').forEach((el) => {
    if (NATIVE.has(el.tagName) || el.hasAttribute('role') || el.closest('a,button')) return;
    el.setAttribute('role', 'button');
    if (!el.hasAttribute('tabindex')) el.tabIndex = 0;
  });
}

export function installA11y() {
  if (typeof document === 'undefined') return;
  const schedule = (() => {
    let queued = false;
    return () => {
      if (queued) return;
      queued = true;
      // setTimeout, not requestAnimationFrame: rAF is paused in background tabs / in-app browsers
      setTimeout(() => {
        queued = false;
        upgrade(document.body);
      }, 0);
    };
  })();
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });
  schedule();
  document.addEventListener('keydown', (e) => {
    const el = e.target as HTMLElement | null;
    if (!el || el.getAttribute('role') !== 'button' || NATIVE.has(el.tagName)) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      el.click();
    }
  });
}
