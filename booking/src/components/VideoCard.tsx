import { useState, type ReactNode } from 'react';
import { youtubeEmbedUrl, youtubeThumbs, type PkgVideo } from '../data/videos';

interface Props {
  video: PkgVideo;
  /** text under the player, e.g. package name + starting price */
  caption?: ReactNode;
  onCaptionClick?: () => void;
}

/** 9:16 YouTube Shorts card: poster + play button first, the iframe only mounts after a tap */
export default function VideoCard({ video, caption, onCaptionClick }: Props) {
  const [playing, setPlaying] = useState(false);
  // walk the poster candidates when YouTube has not generated the preferred size
  const thumbs = youtubeThumbs(video.youtubeId);
  const [thumbIdx, setThumbIdx] = useState(0);
  const nextThumb = () => setThumbIdx((i) => Math.min(i + 1, thumbs.length - 1));

  return (
    <div>
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '9 / 16',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-md)',
          background: '#1a1a1a',
        }}
      >
        {playing ? (
          <iframe
            src={youtubeEmbedUrl(video.youtubeId)}
            title={video.label}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0, display: 'block' }}
          />
        ) : (
          <div
            role="button"
            aria-label={`เล่นวิดีโอ ${video.label}`}
            onClick={() => setPlaying(true)}
            className="hoverable"
            style={{ position: 'absolute', inset: 0, cursor: 'pointer' }}
          >
            <img
              src={thumbs[thumbIdx]}
              alt={video.label}
              loading="lazy"
              onError={nextThumb}
              // a missing size is served as an HTTP 404 *with* a 120×90 grey placeholder body, which
              // counts as a successful load — so treat anything that small as missing too
              onLoad={(e) => {
                if (e.currentTarget.naturalWidth <= 120) nextThumb();
              }}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            {/* darken the bottom so the label stays readable on any poster */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,.55) 100%)',
              }}
            ></div>
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: 58,
                height: 58,
                borderRadius: 999,
                background: 'var(--color-accent)',
                color: 'var(--color-on-accent)',
                display: 'grid',
                placeItems: 'center',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ marginLeft: 3 }}>
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <div
              style={{
                position: 'absolute',
                left: 12,
                right: 12,
                bottom: 12,
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                lineHeight: 1.4,
                textShadow: '0 1px 2px rgba(0,0,0,.5)',
              }}
            >
              {video.label}
            </div>
          </div>
        )}
      </div>

      {caption && (
        <div
          onClick={onCaptionClick}
          className={onCaptionClick ? 'hoverable' : undefined}
          style={{ marginTop: 8, cursor: onCaptionClick ? 'pointer' : 'default' }}
        >
          {caption}
        </div>
      )}
      <a
        href={video.url}
        target="_blank"
        rel="noreferrer"
        style={{ display: 'inline-block', marginTop: 4, fontSize: 12, color: 'var(--color-neutral-600)', textDecoration: 'none' }}
      >
        ดูบน YouTube ↗
      </a>
    </div>
  );
}
