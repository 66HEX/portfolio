// Icons © Nucleo — sourced from the free UI Essential Outline and Social Media collections.
type IconElementBase = {
  fill?: "none" | "currentColor";
  fillRule?: "evenodd" | "nonzero";
  stroke?: boolean;
};

export type IconElement =
  | (IconElementBase & { type: "path"; d: string })
  | (IconElementBase & { type: "polyline"; points: string })
  | (IconElementBase & { type: "line"; x1: string; y1: string; x2: string; y2: string })
  | (IconElementBase & {
      type: "rect";
      x: string;
      y: string;
      width: string;
      height: string;
      rx?: string;
      ry?: string;
    })
  | (IconElementBase & { type: "circle"; cx: string; cy: string; r: string });

export type IconData = {
  viewBox: string;
  elements: readonly IconElement[];
  transform?: string;
};

const uiIcon = (elements: readonly IconElement[], transform?: string): IconData => ({
  viewBox: "0 0 18 18",
  elements,
  transform,
});

const socialIcon = (d: string, fillRule?: "evenodd"): IconData => ({
  viewBox: "0 0 32 32",
  elements: [{ type: "path", d, fill: "currentColor", fillRule }],
});

export const IconArrowLeft = uiIcon([{ type: "polyline", points: "11.5 15.25 5.25 9 11.5 2.75", stroke: true }]);

export const IconCheck = uiIcon([{ type: "polyline", points: "2.75 9.25 6.75 14.25 15.25 3.75", stroke: true }]);

export const IconChevronRight = uiIcon([{ type: "polyline", points: "6.5 2.75 12.75 9 6.5 15.25", stroke: true }]);

export const IconClose = uiIcon([
  { type: "line", x1: "14", y1: "4", x2: "4", y2: "14", stroke: true },
  { type: "line", x1: "4", y1: "4", x2: "14", y2: "14", stroke: true },
]);

export const IconCopy = uiIcon([
  {
    type: "path",
    d: "M6.25,2.75h-1c-1.105,0-2,.895-2,2V14.25c0,1.105,.895,2,2,2h7.5c1.105,0,2-.895,2-2V4.75c0-1.105-.895-2-2-2h-1",
    stroke: true,
  },
  {
    type: "rect",
    x: "6.25",
    y: "1.25",
    width: "5.5",
    height: "3",
    rx: "1",
    ry: "1",
    stroke: true,
  },
]);

export const IconFile = uiIcon([
  { type: "line", x1: "5.75", y1: "6.75", x2: "7.75", y2: "6.75", stroke: true },
  { type: "line", x1: "5.75", y1: "9.75", x2: "12.25", y2: "9.75", stroke: true },
  { type: "line", x1: "5.75", y1: "12.75", x2: "12.25", y2: "12.75", stroke: true },
  {
    type: "path",
    d: "M2.75,14.25V3.75c0-1.105,.895-2,2-2h5.586c.265,0,.52,.105,.707,.293l3.914,3.914c.188,.188,.293,.442,.293,.707v7.586c0,1.105-.895,2-2,2H4.75c-1.105,0-2-.895-2-2Z",
    stroke: true,
  },
  {
    type: "path",
    d: "M15.16,6.25h-3.41c-.552,0-1-.448-1-1V1.852",
    stroke: true,
  },
]);

export const IconGitHub = socialIcon(
  "M16,2.345c7.735,0,14,6.265,14,14-.002,6.015-3.839,11.359-9.537,13.282-.7,.14-.963-.298-.963-.665,0-.473,.018-1.978,.018-3.85,0-1.312-.437-2.152-.945-2.59,3.115-.35,6.388-1.54,6.388-6.912,0-1.54-.543-2.783-1.435-3.762,.14-.35,.63-1.785-.14-3.71,0,0-1.173-.385-3.85,1.435-1.12-.315-2.31-.472-3.5-.472s-2.38,.157-3.5,.472c-2.677-1.802-3.85-1.435-3.85-1.435-.77,1.925-.28,3.36-.14,3.71-.892,.98-1.435,2.24-1.435,3.762,0,5.355,3.255,6.563,6.37,6.913-.403,.35-.77,.963-.893,1.872-.805,.368-2.818,.963-4.077-1.155-.263-.42-1.05-1.452-2.152-1.435-1.173,.018-.472,.665,.017,.927,.595,.332,1.277,1.575,1.435,1.978,.28,.787,1.19,2.293,4.707,1.645,0,1.173,.018,2.275,.018,2.607,0,.368-.263,.787-.963,.665-5.719-1.904-9.576-7.255-9.573-13.283,0-7.735,6.265-14,14-14Z",
);

export const IconInfo = uiIcon([
  {
    type: "path",
    d: "M9 16.25C13.004 16.25 16.25 13.004 16.25 9C16.25 4.996 13.004 1.75 9 1.75C4.996 1.75 1.75 4.996 1.75 9C1.75 13.004 4.996 16.25 9 16.25Z",
    stroke: true,
  },
  { type: "path", d: "M9 12.75V9.25C9 8.9739 8.7761 8.75 8.5 8.75H7.75", stroke: true },
  {
    type: "path",
    d: "M9 6.75C8.448 6.75 8 6.301 8 5.75C8 5.199 8.448 4.75 9 4.75C9.552 4.75 10 5.199 10 5.75C10 6.301 9.552 6.75 9 6.75Z",
    fill: "currentColor",
  },
]);

export const IconLink = uiIcon([
  {
    type: "path",
    d: "M8.36909 6.8934C8.06649 7.0539 7.78239 7.2617 7.52799 7.517L7.51799 7.527C6.13699 8.908 6.13699 11.146 7.51799 12.527L9.69299 14.702C11.074 16.083 13.312 16.083 14.693 14.702L14.703 14.692C16.084 13.311 16.084 11.073 14.703 9.692L13.9406 8.9296",
    stroke: true,
  },
  {
    type: "path",
    d: "M9.63289 11.1066C9.93549 10.9461 10.2196 10.7383 10.474 10.483L10.484 10.473C11.865 9.09199 11.865 6.85399 10.484 5.47299L8.30899 3.29799C6.92799 1.91699 4.68999 1.91699 3.30899 3.29799L3.29899 3.30799C1.91799 4.68899 1.91799 6.92699 3.29899 8.30799L4.06139 9.07039",
    stroke: true,
  },
]);

export const IconLinkedIn = socialIcon(
  "M26.111,3H5.889c-1.595,0-2.889,1.293-2.889,2.889V26.111c0,1.595,1.293,2.889,2.889,2.889H26.111c1.595,0,2.889-1.293,2.889-2.889V5.889c0-1.595-1.293-2.889-2.889-2.889ZM10.861,25.389h-3.877V12.87h3.877v12.519Zm-1.957-14.158c-1.267,0-2.293-1.034-2.293-2.31s1.026-2.31,2.293-2.31,2.292,1.034,2.292,2.31-1.026,2.31-2.292,2.31Zm16.485,14.158h-3.858v-6.571c0-1.802-.685-2.809-2.111-2.809-1.551,0-2.362,1.048-2.362,2.809v6.571h-3.718V12.87h3.718v1.686s1.118-2.069,3.775-2.069,4.556,1.621,4.556,4.975v7.926Z",
  "evenodd",
);

const darkLightElements: readonly IconElement[] = [
  { type: "path", d: "M9,6v6c1.657,0,3-1.343,3-3s-1.343-3-3-3Z", fill: "currentColor" },
  {
    type: "path",
    d: "M9,12c-1.657,0-3-1.343-3-3s1.343-3,3-3V1.75C4.996,1.75,1.75,4.996,1.75,9s3.246,7.25,7.25,7.25v-4.25Z",
    fill: "currentColor",
  },
  { type: "circle", cx: "9", cy: "9", r: "7.25", stroke: true },
];

export const IconMoon = uiIcon(darkLightElements, "matrix(-1 0 0 1 18 0)");

export const IconSend = uiIcon([
  { type: "line", x1: "15.813", y1: "2.187", x2: "7.657", y2: "10.343", stroke: true },
  {
    type: "path",
    d: "M15.947,2.73l-4.154,12.923c-.142,.443-.743,.509-.977,.106l-3.159-5.416L2.241,7.184c-.402-.235-.337-.835,.106-.977L15.27,2.053c.417-.134,.811,.26,.677,.677Z",
    stroke: true,
  },
]);

export const IconSun = uiIcon(darkLightElements);

export const IconX = socialIcon(
  "M18.42,14.009L27.891,3h-2.244l-8.224,9.559L10.855,3H3.28l9.932,14.455L3.28,29h2.244l8.684-10.095,6.936,10.095h7.576l-10.301-14.991h0Zm-3.074,3.573l-1.006-1.439L6.333,4.69h3.447l6.462,9.243,1.006,1.439,8.4,12.015h-3.447l-6.854-9.804h0Z",
);
