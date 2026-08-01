<script lang="ts">
  import type { IconData } from "./icons";

  type Props = {
    icon: IconData;
    size?: string | number;
    strokeWidth?: number;
    color?: string;
    class?: string;
  };

  let { icon, size = 24, strokeWidth = 1.5, color = "currentColor", class: className = "" }: Props = $props();
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  width={size}
  height={size}
  viewBox={icon.viewBox}
  fill="none"
  {color}
  class={className}
  aria-hidden="true"
  focusable="false"
>
  <g transform={icon.transform}>
    {#each icon.elements as element, index (`${element.type}-${index}`)}
      {#if element.type === "path"}
        <path
          d={element.d}
          fill={element.fill ?? (element.stroke ? "none" : "currentColor")}
          fill-rule={element.fillRule}
          stroke={element.stroke ? "currentColor" : undefined}
          stroke-width={element.stroke ? strokeWidth : undefined}
          stroke-linecap={element.stroke ? "round" : undefined}
          stroke-linejoin={element.stroke ? "round" : undefined}
        />
      {:else if element.type === "polyline"}
        <polyline
          points={element.points}
          fill={element.fill ?? "none"}
          stroke={element.stroke ? "currentColor" : undefined}
          stroke-width={element.stroke ? strokeWidth : undefined}
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      {:else if element.type === "line"}
        <line
          x1={element.x1}
          y1={element.y1}
          x2={element.x2}
          y2={element.y2}
          stroke={element.stroke ? "currentColor" : undefined}
          stroke-width={element.stroke ? strokeWidth : undefined}
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      {:else if element.type === "rect"}
        <rect
          x={element.x}
          y={element.y}
          width={element.width}
          height={element.height}
          rx={element.rx}
          ry={element.ry}
          fill={element.fill ?? "none"}
          stroke={element.stroke ? "currentColor" : undefined}
          stroke-width={element.stroke ? strokeWidth : undefined}
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      {:else}
        <circle
          cx={element.cx}
          cy={element.cy}
          r={element.r}
          fill={element.fill ?? "none"}
          stroke={element.stroke ? "currentColor" : undefined}
          stroke-width={element.stroke ? strokeWidth : undefined}
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      {/if}
    {/each}
  </g>
</svg>
