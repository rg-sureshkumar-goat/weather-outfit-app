// Interface icons. Simple placeholders until the final set in C10; each is
// decorative (aria-hidden) and sits next to a text label.

const svg = (body, size = 22) =>
  `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;

export const ICONS = {
  search: svg('<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>'),
  pin: svg('<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'),
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  chevron: svg('<path d="M7 10l5 5 5-5"/>', 18),
};
