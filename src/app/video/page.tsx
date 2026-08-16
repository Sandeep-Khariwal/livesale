"use client";

import { useState } from "react";
import Link from "next/link";
import "./video.css";


// "poster" is optional — leave it out (or point to a missing file) and
// the card just shows a plain play button instead of a thumbnail.
const VIDEOS = [
  { id: 1, src: "/v.mp4", poster: "", label: "Product 1" },
  { id: 2, src: "/v2.mp4", poster: "", label: "Product 2" },
  { id: 3, src: "/v1.mp4", poster: "", label: "Product 3" },
  { id: 4, src: "/v5.mp4", poster: "", label: "Product 4" },
//   { id: 5, src: "/v6.mp4", poster: "", label: "Product 5" },
  { id: 6, src: "/v7.mp4", poster: "", label: "Product 6" },
  // { id: 4, src: "/your-file.mp4", poster: "/thumbs/your-file.jpg", label: "Product 4" },
  // ...add the rest of your 10 the same way
];

export default function VideosPage() {
  const [playingId, setPlayingId] = useState<number | null>(null);

  return (
    <div className="vid-page">
      <Link href="/" className="vid-back-link">
        ← Back to Home
      </Link>

      <div className="vid-header">
        <div className="vid-eyebrow">
          <span className="vid-line" />
          EXCLUSIVE
          <span className="vid-line" />
        </div>
        <h1 className="vid-title">Product Videos</h1>
        <p className="vid-subtitle"></p>
      </div>

      <div className="vid-grid">
        {VIDEOS.map((v) => (
          <div className="vid-card" key={v.id}>
            {playingId === v.id ? (
              <video
                className="vid-player"
                src={v.src}
                controls
                autoPlay
                playsInline
                preload="metadata"
              />
            ) : (
              <button
                type="button"
                className="vid-thumb-btn"
                onClick={() => setPlayingId(v.id)}
                aria-label={`Play ${v.label}`}
                style={v.poster ? { backgroundImage: `url(${v.poster})` } : undefined}
              >
                <span className="vid-play-icon">▶</span>
                <span className="vid-label">{v.label}</span>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}