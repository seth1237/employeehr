import { MIST_PARTICLES } from "@/lib/landing/motion";

export function HubMist() {
  return (
    <g aria-hidden="true" pointerEvents="none" data-hub-mist="true">
      <defs>
        <linearGradient
          id="mist-height"
          x1="512"
          y1="321"
          x2="512"
          y2="484"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="white" stopOpacity="0" />
          <stop offset=".22" stopColor="white" stopOpacity=".12" />
          <stop offset=".52" stopColor="white" stopOpacity=".72" />
          <stop offset=".82" stopColor="white" stopOpacity=".94" />
          <stop offset="1" stopColor="white" stopOpacity=".35" />
        </linearGradient>
        <radialGradient id="mist-light">
          <stop stopColor="#b9dbff" stopOpacity=".42" />
          <stop offset=".55" stopColor="#88b8ff" stopOpacity=".25" />
          <stop offset="1" stopColor="#9ac8ff" stopOpacity="0" />
        </radialGradient>
        <filter id="mist-feather" x="-15%" y="-10%" width="130%" height="125%">
          <feGaussianBlur stdDeviation="3.2" />
        </filter>
        <mask id="mist-volume" maskUnits="userSpaceOnUse" x="426" y="308" width="172" height="181">
          <path
            d="M454 448C451 422 444 372 438 332Q512 311 586 332C580 372 573 422 570 448A58 30.2 0 0 1 454 448Z"
            fill="url(#mist-height)"
            filter="url(#mist-feather)"
          />
        </mask>
        <filter
          id="mist-texture"
          x="0"
          y="0"
          width="100%"
          height="100%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency=".038 .062"
            numOctaves="3"
            seed="12"
            stitchTiles="stitch"
          />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 .43  0 0 0 0 .66  0 0 0 0 1  0 0 0 1.65 -.48"
          />
        </filter>
        <filter
          id="mist-grain"
          x="0"
          y="0"
          width="100%"
          height="100%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency=".47 .58"
            numOctaves="1"
            seed="7"
            stitchTiles="stitch"
          />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 .7  0 0 0 0 .83  0 0 0 0 1  0 0 0 2.1 -.9"
          />
        </filter>
      </defs>
      <g mask="url(#mist-volume)">
        <ellipse cx="512" cy="431" rx="77" ry="89" fill="url(#mist-light)" />
        {[0, 1].map((layer) => (
          <g key={layer} data-mist-layer="true" opacity="0">
            <rect
              x="431"
              y="313"
              width="162"
              height="260"
              fill="white"
              filter="url(#mist-texture)"
            />
            <rect
              x="431"
              y="313"
              width="162"
              height="260"
              fill="white"
              filter="url(#mist-grain)"
              opacity=".36"
            />
          </g>
        ))}
        {MIST_PARTICLES.map((particle, index) => (
          <circle
            key={index}
            data-mist-particle="true"
            cx="512"
            cy="448"
            r={particle.size}
            fill={index % 4 ? "#ecf7ff" : "#a5cdff"}
            opacity="0"
          />
        ))}
      </g>
    </g>
  );
}
