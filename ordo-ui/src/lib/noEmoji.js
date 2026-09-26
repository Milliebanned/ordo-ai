// Strips emoji from text coming back from the backend, recursively through objects and arrays.
// Only the emoji (and one space after it) is removed, so markdown indentation stays intact.
const EMOJI = /(?:\p{Emoji_Presentation}|\p{Extended_Pictographic}\u{FE0F}|[\u{2714}\u{2716}\u{26A0}\u{2757}\u{2753}]|\p{Emoji_Modifier}|\u{200D}|\u{FE0F}|\u{20E3})+[ \t]?/gu;

export function stripEmoji(value) {
  if (typeof value === 'string') return value.replace(EMOJI, '');
  if (Array.isArray(value)) return value.map(stripEmoji);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = stripEmoji(v);
    return out;
  }
  return value;
}
