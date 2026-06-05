// Preloads the CC0 sprite assets and exposes them once ready.
(function () {
  const PLANE_FILES = [
    "assets/planes/ship_0000.png",
    "assets/planes/ship_0001.png",
    "assets/planes/ship_0002.png",
    "assets/planes/ship_0004.png",
    "assets/planes/ship_0006.png",
  ];

  const Assets = {
    planes: [],
    ready: false,
    load() {
      const jobs = PLANE_FILES.map(
        (src) =>
          new Promise((resolve) => {
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
    planeFor(skin) {
      const arr = Assets.planes;
      if (!arr.length) return null;
      return arr[skin % arr.length] || arr[0];
    },
  };

  window.Assets = Assets;
})();
