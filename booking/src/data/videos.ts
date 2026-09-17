/**
 * YouTube Shorts review clips, keyed by package id.
 * Only the merit "full" packages (พิธีสงฆ์ + อาหารเลี้ยงแขก) have one — catering packages
 * have no key here, so nothing on the buffet / chinese storefronts ever renders a video.
 */
export interface PkgVideo {
  youtubeId: string;
  /** the original share link (opens the YouTube app on mobile) */
  url: string;
  label: string;
}

export const PKG_VIDEOS: Record<string, PkgVideo> = {
  full: { youtubeId: '4Z_C2erpRVQ', url: 'https://youtube.com/shorts/4Z_C2erpRVQ', label: 'รีวิวแพ็กเกจครบวงจร' },
  'full-plus': { youtubeId: 'aPa6YClpI9I', url: 'https://youtube.com/shorts/aPa6YClpI9I', label: 'รีวิวแพ็กเกจครบวงจร พลัส' },
  prime: { youtubeId: 'xI5jpnJhWeE', url: 'https://youtube.com/shorts/xI5jpnJhWeE', label: 'รีวิวแพ็กเกจ PRIME ครบวงจร' },
};

/** privacy-enhanced embed; autoplay because the iframe is only mounted after the customer taps play */
export const youtubeEmbedUrl = (id: string) =>
  `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1&rel=0&modestbranding=1`;

/**
 * Poster candidates, best first. `oardefault` is the true 9:16 Shorts poster but YouTube only
 * generates it for some clips; `maxresdefault` is 16:9 with the vertical frame centred, so
 * `object-fit: cover` in a 9:16 box crops it to exactly the video content; `hqdefault` always exists.
 */
export const youtubeThumbs = (id: string) => [
  `https://i.ytimg.com/vi/${id}/oardefault.jpg`,
  `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
  `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
];
