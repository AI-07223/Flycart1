// Preloads the CC0 sprite assets and exposes them once ready.

const PLANE_FILES = [
  "assets/planes/ship_0000.png",
  "assets/planes/ship_0001.png",
  "assets/planes/ship_0002.png",
  "assets/planes/ship_0004.png",
  "assets/planes/ship_0006.png",
];

const Assets = {
  planes: [] as (HTMLImageElement | null)[],
  ready: false,

  load(): Promise<typeof Assets> {
    const jobs = PLANE_FILES.map(
      (src) =>
        new Promise<HTMLImageElement | null>((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null); // tolerate a missing sprite
          img.src = src;
        })
    );
    return Promise.all(jobs).then((imgs) => {
      Assets.planes = imgs;
      Assets.ready = true;
      return Assets;
    });
  },

  planeFor(skin: number): HTMLImageElement | null {
    const arr = Assets.planes;
    if (!arr.length) return null;
    return arr[skin % arr.length] || arr[0];
  },
};

(window as any).Assets = Assets;
