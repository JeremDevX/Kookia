// Native CSS syntax is not a design token. Keep this list explicit: accepting
// every identifier would also let named colours such as red or white slip in.
export const cssKeywords = new Set(`
  absolute all alternate antialiased at auto auto-fill auto-fit background-color
  block border-box border-color both box-shadow break-word capitalize center
  collapse color column column-reverse currentColor dashed default ease
  ease-in-out ease-out ellipse ellipsis end fit-content fixed flex flex-end
  flex-start grayscale grid hidden infinite inline inline-flex inset left linear
  middle monospace none normal not-allowed nowrap opacity pointer relative right
  row safe-area-inset-bottom separate solid space-between span start static
  sticky stretch tabular-nums text touch transform transparent underline
  uppercase visibility visible width wrap
`.trim().split(/\s+/));
