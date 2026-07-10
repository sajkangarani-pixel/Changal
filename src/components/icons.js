const icons = {
  search:
    '<circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.4-3.4"></path>',
  sliders:
    '<path d="M4 7h9"></path><path d="M17 7h3"></path><circle cx="15" cy="7" r="2"></circle><path d="M4 17h3"></path><path d="M11 17h9"></path><circle cx="9" cy="17" r="2"></circle>',
  bell:
    '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path><path d="M10 21h4"></path>',
  user:
    '<circle cx="12" cy="8" r="4"></circle><path d="M4 21a8 8 0 0 1 16 0"></path>',
  discover:
    '<path d="M12 3l3.6 7.4L23 12l-7.4 1.6L12 21l-3.6-7.4L1 12l7.4-1.6L12 3z"></path>',
  explore:
    '<circle cx="12" cy="12" r="9"></circle><path d="m15 9-2 6-4 2 2-6 4-2z"></path>',
  saved:
    '<path d="M19 21 12 17 5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>',
  heart:
    '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"></path>',
  profile:
    '<path d="M20 21a8 8 0 0 0-16 0"></path><circle cx="12" cy="7" r="4"></circle>',
  arrow:
    '<path d="M5 12h14"></path><path d="m13 6 6 6-6 6"></path>',
  back:
    '<path d="M19 12H5"></path><path d="m11 6-6 6 6 6"></path>',
  share:
    '<circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><path d="m8.6 10.5 6.8-4"></path><path d="m8.6 13.5 6.8 4"></path>',
  x:
    '<path d="M18 6 6 18"></path><path d="m6 6 12 12"></path>',
  dice:
    '<rect x="4" y="4" width="16" height="16" rx="4"></rect><circle cx="9" cy="9" r="1"></circle><circle cx="15" cy="15" r="1"></circle><circle cx="15" cy="9" r="1"></circle><circle cx="9" cy="15" r="1"></circle>',
  cards:
    '<rect x="7" y="3" width="10" height="14" rx="2"></rect><path d="M6 7 4.6 17.2A2 2 0 0 0 6.6 19.5l8.6 1.2"></path>',
  globe:
    '<circle cx="12" cy="12" r="9"></circle><path d="M3 12h18"></path><path d="M12 3a15 15 0 0 1 0 18"></path><path d="M12 3a15 15 0 0 0 0 18"></path>',
  hand:
    '<path d="M8 11V5a2 2 0 1 1 4 0v5"></path><path d="M12 10V4a2 2 0 1 1 4 0v8"></path><path d="M16 11V7a2 2 0 1 1 4 0v6c0 5-3 8-8 8H9a5 5 0 0 1-4.2-2.2L3 16"></path>',
  sparkles:
    '<path d="M12 3l1.8 4.6L18 9.5l-4.2 1.9L12 16l-1.8-4.6L6 9.5l4.2-1.9L12 3z"></path><path d="M19 14l.8 2.1L22 17l-2.2.9L19 20l-.8-2.1L16 17l2.2-.9L19 14z"></path>',
  clock:
    '<circle cx="12" cy="12" r="9"></circle><path d="M12 7v6l4 2"></path>',
  users:
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.9"></path><path d="M16 3.1a4 4 0 0 1 0 7.8"></path>',
  activity:
    '<path d="M22 12h-4l-3 8L9 4l-3 8H2"></path>',
  play:
    '<path d="m8 5 12 7-12 7z"></path>',
  reset:
    '<path d="M3 12a9 9 0 1 0 3-6.7"></path><path d="M3 4v6h6"></path>',
  logout:
    '<path d="M10 17l5-5-5-5"></path><path d="M15 12H3"></path><path d="M21 19V5a2 2 0 0 0-2-2h-6"></path><path d="M13 21h6a2 2 0 0 0 2-2"></path>',
  check:
    '<path d="m20 6-11 11-5-5"></path>',
  plus:
    '<path d="M12 5v14"></path><path d="M5 12h14"></path>',
  grid:
    '<rect x="3" y="3" width="7" height="7" rx="2"></rect><rect x="14" y="3" width="7" height="7" rx="2"></rect><rect x="14" y="14" width="7" height="7" rx="2"></rect><rect x="3" y="14" width="7" height="7" rx="2"></rect>',
  offline:
    '<path d="m2 2 20 20"></path><path d="M8.5 8.5A6 6 0 0 1 18 13v1"></path><path d="M6 13v-1a6 6 0 0 1 .3-1.9"></path><path d="M12 20h.01"></path>'
};

export function icon(name, size = 20, className = "") {
  const body = icons[name] || icons.sparkles;
  return `<svg class="${className}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}
