export const publicationSources = {
  codrops: "Codrops",
} as const;

type ExternalPost = {
  title: string;
  description: string;
  date: string;
  href: `https://${string}`;
  source: keyof typeof publicationSources;
  published: boolean;
};

export const externalPosts: ExternalPost[] = [
  {
    title: "Building a Real-Time 3D Face Mask with MediaPipe, Threlte and Three.js",
    description: "Turning face landmarks into a textured 3D mesh that follows the webcam feed.",
    date: "2026-09-06",
    href: "https://tympanus.net/codrops/2026/09/06/building-a-real-time-3d-face-mask-with-mediapipe-threlte-and-three-js/",
    source: "codrops",
    published: true,
  },
];
