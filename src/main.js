import * as THREE from 'three';
    import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
    import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
    import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
    import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
    import { GlitchPass } from 'three/examples/jsm/postprocessing/GlitchPass.js';

    let container;
    let camera, scene, renderer, composer;
    const group = new THREE.Group();

    const cameraPivot = new THREE.Object3D();

    let cameraTarget = new THREE.Vector3();
    let cameraPositionTarget = new THREE.Vector3();
    let cameraRotationTargetY = 0;
    let cameraRotationTargetX = 0;

    const views = [
      { position: new THREE.Vector3(0, 0, 200), lookAt: new THREE.Vector3(0, 0, 0), rotationY: 0, rotationX: 0 },
      { position: new THREE.Vector3(0, 0, 300), lookAt: new THREE.Vector3(0, 0, 0), rotationY: Math.PI / 8, rotationX: Math.PI / 16 },
      { position: new THREE.Vector3(200, -700, 1600), lookAt: new THREE.Vector3(200, -700, 0), rotationY: Math.PI / 3, rotationX: Math.PI / 6 },
      { position: new THREE.Vector3(0, 0, 200), lookAt: new THREE.Vector3(0, 0, 0), rotationY: Math.PI / 6, rotationX: Math.PI / 8 }
    ];

    let objectsLoaded = 0;
    const totalObjects = 3;

    init();
    animate();

    function init() {
      container = document.createElement('div');
      document.body.appendChild(container);

      camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 20000);
      camera.position.copy(views[0].position);
      camera.lookAt(views[0].lookAt);

      scene = new THREE.Scene();
      cameraPivot.add(camera);
      scene.add(cameraPivot);

      const ambientLight = new THREE.AmbientLight(0xcccccc, 0.4);
      scene.add(ambientLight);
      const pointLight = new THREE.PointLight(0xffffff, 0.8);
      camera.add(pointLight);

      scene.add(group);

      const material = new THREE.MeshNormalMaterial();

      function finalizePositioning() {
        if (objectsLoaded === totalObjects) {
          const box = new THREE.Box3().setFromObject(group);
          const center = new THREE.Vector3();
          box.getCenter(center);
          const size = new THREE.Vector3();
          box.getSize(size);
          group.position.sub(center); // Recentre le groupe autour de l'origine
          group.position.y -= (size.y - (size.y / 6)) / 2;
          group.position.x -= (size.x - (size.x / 20)) / 3;
        }
      }


      const objLoader = new OBJLoader();

      let objectsLoaded = 0;
      const totalObjects = 3;

      function loadModel(path, position, scale, rotation) {
        objLoader.load(path, (obj) => {

          obj.traverse(child => {
            if (child instanceof THREE.Mesh) {
              child.material = material;
            }
          });
          obj.position.copy(position);
          obj.scale.copy(scale);
          obj.rotation.y = rotation;
          group.add(obj);
          
          objectsLoaded++;
          if (objectsLoaded === totalObjects) {
            finalizePositioning();
          }
        },);
      }

      loadModel('./models/fix skeleton/source/skeleton.OBJ', new THREE.Vector3(-190, -455, 0), new THREE.Vector3(160, 160, 160), 1);
      loadModel('./models/Headphones2.obj', new THREE.Vector3(-265, 15, 180), new THREE.Vector3(16, 16, 16), 1);
      loadModel('./models/glasses.obj', new THREE.Vector3(-130, 40, 38), new THREE.Vector3(38, 38, 38), -2);

            

      renderer = new THREE.WebGLRenderer();
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(window.innerWidth, window.innerHeight);
      container.appendChild(renderer.domElement);

      // Post-processing VHS effect
      composer = new EffectComposer(renderer);
      const renderPass = new RenderPass(scene, camera);
      composer.addPass(renderPass);

      const glitchPass = new GlitchPass();
      glitchPass.goWild = false;
      composer.addPass(glitchPass);

      // Custom shader for VHS distortion
      const vhsShader = {
        uniforms: {
          tDiffuse: { value: null },
          time: { value: 0.0 }
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D tDiffuse;
          uniform float time;
          varying vec2 vUv;

          void main() {
            float strength = 0.005;
            float yOffset = sin(vUv.y * 3.0 + time * 0.5) * strength;
            vec2 uv = vUv + vec2(yOffset, 0.06);
            vec3 color = texture2D(tDiffuse, uv).rgb;

            float noise = fract(sin(dot(uv ,vec2(12.9898,78.233))) * 43758.5453);
            color.rgb += noise * 0.07;

            gl_FragColor = vec4(color, 1.0);
          }
        `
      };

      const vhsPass = new ShaderPass(vhsShader);
      composer.addPass(vhsPass);

      window.addEventListener('resize', onWindowResize);
      window.addEventListener('scroll', onScroll);
    }

    function onWindowResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
    }

    function onScroll() {
      const scroll = window.scrollY;
      const scrollHeight = document.body.scrollHeight - window.innerHeight;
      const percent = scroll / scrollHeight;

      const index = Math.min(Math.floor(percent * views.length), views.length - 1);
      const nextIndex = Math.min(index + 1, views.length - 1);
      const localPercent = (percent * views.length) % 1;

      cameraPositionTarget = new THREE.Vector3().lerpVectors(
        views[index].position,
        views[nextIndex].position,
        localPercent
      );

      cameraTarget = new THREE.Vector3().lerpVectors(
        views[index].lookAt,
        views[nextIndex].lookAt,
        localPercent
      );

      cameraRotationTargetY = THREE.MathUtils.lerp(
        views[index].rotationY,
        views[nextIndex].rotationY,
        localPercent
      );

      cameraRotationTargetX = THREE.MathUtils.lerp(
        views[index].rotationX,
        views[nextIndex].rotationX,
        localPercent
      );
    }

    function animate(time) {
      requestAnimationFrame(animate);
      render(time);
    }

    function render(time) {
      camera.position.lerp(cameraPositionTarget, 0.05);
      camera.lookAt(cameraTarget);
      cameraPivot.rotation.y += (cameraRotationTargetY - cameraPivot.rotation.y) * 0.05;
      cameraPivot.rotation.x += (cameraRotationTargetX - cameraPivot.rotation.x) * 0.05;

      composer.passes[2].uniforms.time.value = time * 0.001; // VHS shader time
      composer.render();
    }


    
