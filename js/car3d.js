/* =========================================================
   RR LOCATION — Clio 3D (hero)

   Charge un vrai fichier 3D (.glb) au lieu de générer une
   silhouette procédurale. Place ton fichier dans
   build/models/car.glb (voir build/models/README.txt pour une
   source gratuite CC0 : Kenney Car Kit).
   ========================================================= */

(function () {
  const MODEL_URL = 'models/car.glb';
  // Repeint la carrosserie en rouge RR Location. Passe à false si
  // ton modèle a déjà les bonnes couleurs et que tu veux les garder.
  const FORCE_RED_PAINT = true;
  const PAINT_COLOR = 0xb31219;
  // Au lieu de deviner les noms de matériaux (qui varient selon le
  // modèle), on ne repeint que les matériaux dont la couleur d'origine
  // est bleutée (la carrosserie) : les vitres, pneus, jantes, chromes,
  // plastiques noirs, etc. gardent leur couleur d'origine.
  function isBodyPaintColor(color) {
    const hsl = { h: 0, s: 0, l: 0 };
    color.getHSL(hsl);
    const hueDeg = hsl.h * 360;
    const isBlueHue = hueDeg > 175 && hueDeg < 260;
    return isBlueHue && hsl.s > 0.15 && hsl.l > 0.08 && hsl.l < 0.85;
  }

  const canvas = document.getElementById('carCanvas');
  const fallback = document.getElementById('heroFallback');
  function showFallback() { if (fallback) fallback.style.display = 'block'; if (canvas) canvas.style.display = 'none'; }

  const isMobile = window.matchMedia('(max-width: 760px)').matches;

  if (!canvas || typeof THREE === 'undefined') { showFallback(); return; }
  if (typeof THREE.GLTFLoader === 'undefined') { showFallback(); return; }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (e) {
    showFallback();
    return;
  }

  const container = document.getElementById('carHero');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);

  // Position/cible de référence, pensées pour un cadrage large (bureau).
  const BASE_POS = new THREE.Vector3(3.9, 1.7, 5.6);
  const LOOK_AT = new THREE.Vector3(-0.2, 0.75, 0);
  const BASE_ASPECT = 1.6;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    renderer.setSize(w, h, false);
    const aspect = w / h;
    camera.aspect = aspect;

    // Sur écran étroit (mobile en portrait), le champ de vision
    // horizontal se réduit et coupe les côtés de la voiture : on recule
    // la caméra pour garder toute la carrosserie visible.
    const dollyFactor = aspect < BASE_ASPECT ? Math.min(BASE_ASPECT / aspect, 1.85) : 1;
    const dir = BASE_POS.clone().sub(LOOK_AT).multiplyScalar(dollyFactor);
    camera.position.copy(LOOK_AT).add(dir);
    camera.lookAt(LOOK_AT);

    camera.updateProjectionMatrix();
  }

  /* ---------- lumières ---------- */
  scene.add(new THREE.AmbientLight(0x8ea0c0, 0.55));
  const hemi = new THREE.HemisphereLight(0x9fb4ff, 0x0a0a0c, 0.6);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffffff, 2.1);
  key.position.set(5, 7, 4);
  key.castShadow = true;
  const shadowRes = isMobile ? 512 : 1024;
  key.shadow.mapSize.set(shadowRes, shadowRes);
  key.shadow.camera.left = -4; key.shadow.camera.right = 4;
  key.shadow.camera.top = 4; key.shadow.camera.bottom = -4;
  scene.add(key);

  const rim = new THREE.PointLight(0xe2141f, 8, 12);
  rim.position.set(-3.2, 1.6, -2.5);
  scene.add(rim);

  const fill = new THREE.PointLight(0x6c8dff, 3, 10);
  fill.position.set(-2, 1.2, 3);
  scene.add(fill);

  /* ---------- sol / ombre de contact ---------- */
  function shadowTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(128, 128, 10, 128, 128, 128);
    g.addColorStop(0, 'rgba(0,0,0,0.55)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  }
  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 4.4),
    new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true })
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = 0.011;
  scene.add(shadowPlane);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.ShadowMaterial({ opacity: 0.28 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  /* ---------- chargement du modèle ---------- */
  const car = new THREE.Group();
  scene.add(car);
  const BASE_ROT_Y = -0.42;
  car.rotation.y = BASE_ROT_Y;

  const loader = new THREE.GLTFLoader();
  loader.load(
    MODEL_URL,
    (gltf) => {
      const model = gltf.scene || gltf.scenes[0];

      model.traverse((node) => {
        if (!node.isMesh) return;
        node.castShadow = true;
        node.receiveShadow = true;

        if (FORCE_RED_PAINT) {
          const mats = Array.isArray(node.material) ? node.material : [node.material];
          mats.forEach((mat) => {
            if (!mat || !mat.color) return;
            if (isBodyPaintColor(mat.color)) mat.color.set(PAINT_COLOR);
          });
        }
      });

      /* recentre et met à l'échelle automatiquement, quelle que soit
         la taille d'origine du modèle */
      const box = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      box.getSize(size);

      const targetLength = 3.9; // longueur cible approx. d'une citadine, en unités de scène
      const largestDim = Math.max(size.x, size.y, size.z) || 1;
      const scale = targetLength / largestDim;
      model.scale.setScalar(scale);

      // recalcule la boîte englobante après mise à l'échelle pour poser
      // le modèle bien à plat sur le sol (y = 0)
      const box2 = new THREE.Box3().setFromObject(model);
      const center2 = new THREE.Vector3();
      box2.getCenter(center2);
      model.position.x -= center2.x;
      model.position.z -= center2.z;
      model.position.y -= box2.min.y;

      car.add(model);
    },
    undefined,
    (err) => {
      console.error('Impossible de charger le modèle 3D', err);
      showFallback();
    }
  );

  /* ---------- interaction / boucle d'animation ---------- */
  let targetRotY = BASE_ROT_Y;
  let mouseX = 0;
  window.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
  });
  window.addEventListener('touchmove', (e) => {
    if (e.touches && e.touches[0]) mouseX = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
  }, { passive: true });

  resize();
  window.addEventListener('resize', resize);

  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    if (!reduceMotion) {
      targetRotY = BASE_ROT_Y + Math.sin(t * 0.18) * 0.32 + mouseX * 0.12;
      car.rotation.y += (targetRotY - car.rotation.y) * 0.04;
      car.position.y = Math.sin(t * 0.9) * 0.035;
    }

    renderer.render(scene, camera);
  }
  animate();
})();
