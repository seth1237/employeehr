"use client";

import { useEffect, useRef } from "react";
import { HubMist } from "@/components/home/hub-mist";
import { IsoTile, WorkflowCard, WorkflowLabel } from "@/components/home/scene-tiles";
import {
  BRANCH_PATH,
  cardPulse,
  clamp01,
  MIST_PARTICLES,
  tilePositions,
} from "@/lib/landing/motion";
import { BRANCH_TILES, INPUT_TILES } from "@/lib/landing/workflows";

const CARD_INDEXES = [-3, -2, -1, 0, 1, 2, 3] as const;

type SceneProps = {
  paused: boolean;
  restart: number;
};

export function AutomationScene({ paused, restart }: SceneProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const timeRef = useRef(0);
  const pausedRef = useRef(paused);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    timeRef.current = 0;
  }, [restart]);

  useEffect(() => {
    const root = svgRef.current;
    if (!root) return;

    const cards = [
      ...root.querySelectorAll<SVGElement>("[data-card], [data-label-card]"),
    ];
    const labels = [...root.querySelectorAll<SVGElement>("[data-label-lift]")];
    const inputs = [...root.querySelectorAll<SVGElement>("[data-input]")];
    const branches = [...root.querySelectorAll<SVGElement>("[data-branch]")];
    const glint = root.querySelector<SVGElement>("[data-glint]");
    const halo = root.querySelector<SVGElement>("[data-halo]");
    const particles = [...root.querySelectorAll<SVGElement>("[data-mist-particle]")];
    const layers = [...root.querySelectorAll<SVGElement>("[data-mist-layer]")];
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    const paintMist = (time: number) => {
      layers.forEach((layer, index) => {
        const cycle = (time / 9 + index / 2) % 1;
        layer.setAttribute(
          "transform",
          `translate(${Math.sin(cycle * Math.PI) * (index ? -3 : 3)} ${-(72 * cycle)})`,
        );
        layer.style.opacity = String(Math.sin(cycle * Math.PI) ** 2 * 0.66);
      });

      particles.forEach((particle, index) => {
        const spec = MIST_PARTICLES[index];
        const life = (time / spec.life + spec.phase) % 1;
        const cx =
          512 +
          Math.cos(spec.angle) * spec.radius * (1 + 0.27 * life) +
          Math.sin(5 * life + spec.angle) * life * 2;
        const cy =
          448 + Math.sin(spec.angle) * spec.radius * 0.48 * (1 - life) - 124 * life;
        particle.setAttribute("cx", String(cx));
        particle.setAttribute("cy", String(cy));
        particle.style.opacity = String(
          Math.sin(Math.PI * life) ** 0.65 * (1 - life) * spec.opacity,
        );
      });
    };

    let last = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const delta = Math.min((now - last) / 1000, 0.06);
      last = now;
      if (!pausedRef.current && !reduced.matches && !document.hidden) {
        timeRef.current += delta;
      }

      const time = timeRef.current;
      const pulse = cardPulse(time);

      cards.forEach((node) => {
        const index = Number(node.dataset.card ?? node.dataset.labelCard) + pulse;
        node.setAttribute(
          "transform",
          `matrix(.8660254 -.5 .8660254 .5 ${508 + 134 * index} ${402 - 77.365 * index})`,
        );
        node.style.opacity = String(
          clamp01((index - -1.3) / 0.4) * clamp01((3.8 - index) / 0.4),
        );
      });

      labels.forEach((node) => {
        const lift =
          8 + 1.1 * Math.sin(0.95 * time + 1.2 * Number(node.dataset.labelLift));
        node.setAttribute("transform", `translate(${lift} ${-lift})`);
      });

      const positions = tilePositions(time);

      inputs.forEach((node, index) => {
        const { x, y, opacity } = positions.main[index];
        node.setAttribute(
          "transform",
          `translate(${x} ${y}) matrix(.866 -.5 .866 .5 0 0)`,
        );
        node.style.opacity = String(opacity);
      });

      branches.forEach((node, index) => {
        const { x, y, opacity } = positions.lower[index];
        node.setAttribute(
          "transform",
          `translate(${x} ${y}) matrix(.866 -.5 .866 .5 0 0)`,
        );
        node.style.opacity = String(opacity);
      });

      glint?.setAttribute("transform", `rotate(${28 * time} 512 448)`);
      if (halo) halo.style.opacity = String(0.65 + 0.12 * Math.sin(2.4 * time));
      paintMist(time);
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <svg
      ref={svgRef}
      className="automation-scene"
      viewBox="0 0 1024 720"
      fill="none"
      role="group"
      aria-label="ERP module icons flow into the Elevate hub, which produces moving workflow cards"
    >
      <defs>
        <linearGradient id="tile-face" x1="0" y1="-24" x2="0" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff" />
          <stop offset="1" stopColor="#f9fcfe" />
        </linearGradient>
        <linearGradient
          id="tile-edge"
          x1="-22"
          y1="-22"
          x2="22"
          y2="22"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#dbe5ef" />
          <stop offset=".5" stopColor="#b7c8dc" />
          <stop offset="1" stopColor="#d4e0ee" />
        </linearGradient>
        <linearGradient
          id="card-face"
          x1="130"
          y1="0"
          x2="24"
          y2="112"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#fff" />
          <stop offset=".55" stopColor="#fcfdff" />
          <stop offset="1" stopColor="#edf3fc" />
        </linearGradient>
        <linearGradient
          id="label-blue"
          x1="50"
          y1="73"
          x2="135"
          y2="95"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#6399ff" />
          <stop offset=".5" stopColor="#437ff5" />
          <stop offset="1" stopColor="#3266dc" />
        </linearGradient>
        <linearGradient
          id="hub-side"
          x1="426"
          y1="457"
          x2="598"
          y2="488"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#152d51" />
          <stop offset=".35" stopColor="#061225" />
          <stop offset="1" stopColor="#0b172b" />
        </linearGradient>
        <radialGradient id="hub-face">
          <stop stopColor="#b1d5ee" />
          <stop offset="1" stopColor="#c7e4f4" />
        </radialGradient>
        <radialGradient id="bloom">
          <stop stopColor="#b9d5ff" stopOpacity=".72" />
          <stop offset=".55" stopColor="#d8e7fe" stopOpacity=".5" />
          <stop offset="1" stopColor="#e8f0fc" stopOpacity="0" />
        </radialGradient>
        <linearGradient
          id="exit-fade"
          x1="830"
          y1="290"
          x2="949"
          y2="221"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="white" />
          <stop offset="1" stopColor="black" />
        </linearGradient>
        <mask id="output-mask">
          <rect width="1024" height="720" fill="url(#exit-fade)" />
        </mask>
        <filter id="blur">
          <feGaussianBlur stdDeviation="16" />
        </filter>
        <filter id="small-blur">
          <feGaussianBlur stdDeviation="1.1" />
        </filter>
        <filter id="label-shadow" x="-20%" y="-75%" width="140%" height="250%">
          <feGaussianBlur stdDeviation="2.7" />
        </filter>
        <clipPath id="card-surface-shadow">
          <rect width="132" height="112" rx="11" />
        </clipPath>
        <clipPath id="output-entry">
          <path d="M0 0H1024V743L0 152Z" />
        </clipPath>
        <clipPath id="blue-ring-footprint">
          <ellipse cx="512" cy="448" rx="75" ry="39" />
        </clipPath>
        <mask id="hub-intake" maskUnits="userSpaceOnUse" x="420" y="440" width="185" height="90">
          <rect x="420" y="440" width="185" height="90" fill="white" />
          <path d="M410 506.25L530 437.25V484.25L410 553.25Z" fill="black" />
        </mask>
      </defs>

      <g>
        <ellipse data-halo="true" cx="505" cy="439" rx="169" ry="108" fill="url(#bloom)" />
        <ellipse
          cx="511"
          cy="491"
          rx="159"
          ry="82"
          fill="white"
          opacity=".52"
          filter="url(#blur)"
        />
        <path
          d="M-28 519C50 447 110 424 160 455S254 504 314 533 408 524 476 493"
          stroke="#b5bbc3"
          strokeWidth=".7"
          strokeDasharray="2 3"
        />
        <path
          d={`M113 699.65L523 463.9 ${BRANCH_PATH}`}
          stroke="#b5bbc3"
          strokeWidth=".7"
          strokeDasharray="2 3"
        />

        <g opacity=".65" transform="translate(22 481) matrix(.866 -.5 .866 .5 0 0)">
          <IsoTile kind="warehouse" size={38} />
        </g>
        <g
          className="integration"
          role="img"
          aria-label="CRM module"
          transform="translate(104 493) matrix(.76 -.48 .12 1 0 0)"
        >
          <IsoTile kind="crm" size={47} depth={[-0.44, 2.79]} />
        </g>
        <g
          className="integration"
          role="img"
          aria-label="Inventory module"
          transform="translate(175 489) matrix(.83 .13 .4 .87 0 0)"
          opacity=".66"
        >
          <IsoTile kind="inventory" size={43} depth={[-1.79, 3.72]} />
        </g>
        <g
          className="integration"
          role="img"
          aria-label="Manufacturing module"
          transform="translate(264 501) matrix(.866 -.5 .866 .5 0 0)"
        >
          <IsoTile kind="manufacturing" size={29} />
        </g>

        <g
          className="floating-spark"
          transform="translate(145 345) rotate(-13)"
          filter="url(#small-blur)"
        >
          <path d="m-7-4 9-9 4 4v16l-10 7-3-5Z" fill="#89a8f7" opacity=".6" />
          <path d="m5-16 5 3 1 21-9 9" stroke="white" strokeWidth="4" opacity=".5" />
        </g>

        {INPUT_TILES.map((kind, index) => (
          <g key={kind} data-input={index} opacity="0">
            <IsoTile kind={kind} size={34} />
          </g>
        ))}
        {BRANCH_TILES.map((kind, index) => (
          <g key={kind} data-branch={index} opacity="0">
            <IsoTile kind={kind} size={35} />
          </g>
        ))}

        <g aria-hidden="true" mask="url(#output-mask)" clipPath="url(#output-entry)">
          <g data-card-surfaces="true">
            {CARD_INDEXES.map((index) => (
              <g
                key={`card-${index}`}
                data-card={index}
                transform={`matrix(.8660254 -.5 .8660254 .5 ${508 + 134 * index} ${402 - 77.365 * index})`}
                opacity={index < 0 ? 0 : 1}
              >
                <WorkflowCard index={index} />
              </g>
            ))}
          </g>
          <g data-floating-labels="true">
            {CARD_INDEXES.map((index) => (
              <g
                key={`label-${index}`}
                data-label-card={index}
                transform={`matrix(.8660254 -.5 .8660254 .5 ${508 + 134 * index} ${402 - 77.365 * index})`}
                opacity={index < 0 ? 0 : 1}
              >
                <WorkflowLabel index={index} />
              </g>
            ))}
          </g>
        </g>

        <g className="hub-button" role="img" aria-label="Elevate ERP automation hub">
          <ellipse
            cx="516"
            cy="495"
            rx="87"
            ry="26"
            fill="#b2cce2"
            opacity=".18"
            filter="url(#blur)"
          />
          <path
            d="M426 450h172v18c0 28-38.5 50-86 50s-86-22-86-50Z"
            fill="url(#hub-side)"
            mask="url(#hub-intake)"
          />
          <path
            d="M426 450c0 27.6 38.5 50 86 50s86-22.4 86-50"
            stroke="#020917"
            strokeWidth="1"
          />
          <ellipse
            cx="512"
            cy="450"
            rx="86"
            ry="50"
            fill="#edf5fb"
            stroke="#9eaebf"
            strokeWidth=".8"
          />
          <ellipse cx="512" cy="448" rx="81" ry="46" fill="url(#hub-face)" />
          <g transform="translate(512 448) scale(1 .52)">
            <path
              d="M-10-68a69 69 0 1 0 20 0"
              stroke="#477cf0"
              strokeWidth="13"
              strokeLinecap="round"
            />
            <path
              d="M-10 35a36 36 0 1 1 20 0"
              stroke="#477cf0"
              strokeWidth="13"
              strokeLinecap="round"
            />
            <circle r="15.5" fill="#477cf0" />
          </g>
          <g clipPath="url(#blue-ring-footprint)">
            <g data-glint="true" opacity=".7">
              <circle cx="458" cy="425" r="1" fill="white" />
              <circle cx="565" cy="464" r=".8" fill="white" />
            </g>
          </g>
          <path
            d="M429 452c4 23 40 43 82 43 32 0 62-12 76-27"
            stroke="white"
            strokeWidth="1"
            opacity=".7"
          />
          <HubMist />
        </g>
      </g>
    </svg>
  );
}
