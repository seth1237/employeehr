import { AppIcon, type IconKind } from "@/components/home/landing-icons";
import { WORKFLOWS } from "@/lib/landing/workflows";

export function IsoTile({
  kind,
  size = 38,
  depth = [-3, 3] as [number, number],
}: {
  kind: IconKind;
  size?: number;
  depth?: [number, number];
}) {
  const icon = 0.62 * size;

  return (
    <g>
      <rect
        x={-size / 2 + depth[0]}
        y={-size / 2 + depth[1]}
        width={size}
        height={size}
        rx="6"
        fill="url(#tile-edge)"
        stroke="#aab8c8"
        strokeWidth=".65"
      />
      <rect
        x={-size / 2}
        y={-size / 2}
        width={size}
        height={size}
        rx="6"
        fill="url(#tile-face)"
        stroke="#bac4d0"
        strokeWidth=".8"
      />
      <rect
        x={-size / 2 + 2.6}
        y={-size / 2 + 2.6}
        width={size - 5.2}
        height={size - 5.2}
        rx="4.6"
        stroke="white"
        strokeWidth=".8"
        fill="none"
      />
      <g transform={`translate(${-icon / 2} ${-icon / 2})`}>
        <AppIcon kind={kind} size={icon} />
      </g>
    </g>
  );
}

function workflowFor(index: number) {
  return WORKFLOWS[((index % 3) + 3) % 3];
}

function labelWidth(name: string) {
  return name.length > 16 ? 122 : 102;
}

export function WorkflowCard({ index }: { index: number }) {
  const workflow = workflowFor(index);
  const width = labelWidth(workflow.name);

  return (
    <g>
      <rect
        width="132"
        height="112"
        rx="11"
        transform="translate(0 4)"
        fill="#c8d4df"
        stroke="#a8b3c1"
        strokeWidth=".8"
      />
      <rect
        width="132"
        height="112"
        rx="11"
        fill="url(#card-face)"
        stroke="#c0c8d4"
        strokeWidth=".8"
      />
      <rect
        x="1.8"
        y="1.8"
        width="128.4"
        height="108.4"
        rx="9.2"
        fill="none"
        stroke="white"
        strokeWidth="1"
      />
      <path d="M35 15h80M35 23h55" stroke="white" strokeWidth="1" opacity=".65" />
      {workflow.apps.map((app, i) => (
        <g key={`${app}-${i}`} transform={`translate(8 ${18 + 18 * i})`}>
          <AppIcon kind={app} size={13} />
        </g>
      ))}
      <g clipPath="url(#card-surface-shadow)">
        <rect
          x={126 - width + 1}
          y="78"
          width={width - 2}
          height="16"
          rx="8"
          fill="#294d85"
          opacity=".25"
          filter="url(#label-shadow)"
        />
      </g>
    </g>
  );
}

export function WorkflowLabel({ index }: { index: number }) {
  const workflow = workflowFor(index);
  const width = labelWidth(workflow.name);
  const x = 126 - width;

  return (
    <g data-label-lift={index} transform="translate(8 -8)">
      <rect
        x={x}
        y="73"
        width={width}
        height="18"
        rx="9"
        fill="#2856b5"
        stroke="#204b9d"
        strokeWidth=".6"
        transform="translate(-2.2 2.2)"
      />
      <rect
        x={x}
        y="73"
        width={width}
        height="18"
        rx="9"
        fill="url(#label-blue)"
        stroke="#9bbdff"
        strokeWidth=".7"
      />
      <rect
        x={x + 1.1}
        y="74.1"
        width={width - 2.2}
        height="15.8"
        rx="7.9"
        fill="none"
        stroke="white"
        strokeOpacity=".28"
        strokeWidth=".65"
      />
      <text
        x={x + width / 2}
        y="85.2"
        textAnchor="middle"
        fill="#f4f8ff"
        fontFamily="Arial, sans-serif"
        fontSize="9.5"
        letterSpacing="-.15"
      >
        {workflow.name}
      </text>
    </g>
  );
}
