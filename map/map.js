import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CAMERA_CONFIG } from './js/constants.js';
import { createSky } from './js/sky.js';
import { setupLighting } from './js/lighting.js';
import { CameraController } from './js/camera.js';
import { MovementController } from './js/movement.js';
import { UIController } from './js/ui.js';
import { LabelManager } from './js/labels/index.js';
import { LABEL_INFO } from './js/labels/constants.js';
import { TouchController } from './js/mobile.js';

// Scene setup
const scene = new THREE.Scene();

// Add sky
const sky = createSky();
scene.add(sky);

// Setup lighting
setupLighting(scene);

// Camera setup
const camera = new THREE.PerspectiveCamera(
    CAMERA_CONFIG.fov,
    window.innerWidth / window.innerHeight,
    CAMERA_CONFIG.near,
    CAMERA_CONFIG.far
);
camera.position.set(36, CAMERA_CONFIG.defaultHeight, 22);

// Renderer setup
const renderer = new THREE.WebGLRenderer({
    antialias: false,  // Disable antialiasing for better performance
    powerPreference: 'high-performance'  // Request high-performance GPU
});
renderer.setClearColor('#87ceeb'); // sky blue
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));  // Limit pixel ratio
renderer.shadowMap.enabled = false;  // Disable shadows if not needed
document.body.appendChild(renderer.domElement);

// Performance monitoring
let frameCount = 0;
let lastTime = performance.now();
let fps = 0;

// Create FPS display
const fpsDisplay = document.createElement('div');
fpsDisplay.style.position = 'fixed';
fpsDisplay.style.top = '10px';
fpsDisplay.style.right = '10px';
fpsDisplay.style.padding = '5px 10px';
fpsDisplay.style.background = 'rgba(0, 0, 0, 0.7)';
fpsDisplay.style.color = 'white';
fpsDisplay.style.fontFamily = 'monospace';
fpsDisplay.style.borderRadius = '3px';
fpsDisplay.style.zIndex = '1000';
document.body.appendChild(fpsDisplay);

// Initialize controllers
const cameraController = new CameraController(camera, document.body, scene);
const movementController = new MovementController(cameraController);
const uiController = new UIController(cameraController, movementController);
const labelManager = new LabelManager(scene, camera);
const touchController = new TouchController(cameraController, uiController);
movementController.setUIController(uiController);
cameraController.setUIController(uiController);
labelManager.setCameraController(cameraController);

// Show new mobile movement controls only on touch devices
if ('ontouchstart' in window) {
    const dpad = document.getElementById('mobile-dpad');
    const updown = document.getElementById('mobile-updown');
    if (dpad) dpad.style.display = 'block';
    if (updown) updown.style.display = 'block';

    // Auto-lock pointer controls for mobile so movement works
    setTimeout(() => {
        if (cameraController.getCurrentMode && cameraController.getCurrentMode() === 'EXPLORE') {
            if (cameraController.fpControls && !cameraController.fpControls.isLocked) {
                cameraController.fpControls.lock();
            }
        }
    }, 500);

    // Map button data-move to movementController flags
    const moveMap = {
        up:    { key: 'KeyW' },
        down:  { key: 'KeyS' },
        left:  { key: 'KeyA' },
        right: { key: 'KeyD' },
        jump:  { key: 'Space' },
        downward: { key: 'ShiftLeft' },
    };

    function triggerMove(key, down) {
        const event = { code: key };
        const mode = cameraController.getCurrentMode && cameraController.getCurrentMode();
        console.log(`[D-Pad] ${down ? 'DOWN' : 'UP'} ${key} | Mode: ${mode}`);
        if (down) {
            movementController.handleKeyDown(event);
        } else {
            movementController.handleKeyUp(event);
        }
        // Log movementController flags
        setTimeout(() => {
            console.log('[D-Pad Flags]', {
                moveForward: movementController.moveForward,
                moveBackward: movementController.moveBackward,
                moveLeft: movementController.moveLeft,
                moveRight: movementController.moveRight,
                moveUp: movementController.moveUp,
                moveDown: movementController.moveDown,
            });
        }, 10);
    }

    // D-pad buttons (left)
    document.querySelectorAll('#mobile-dpad .move-btn').forEach(btn => {
        const move = btn.getAttribute('data-move');
        if (!moveMap[move]) return;
        const key = moveMap[move].key;
        btn.addEventListener('touchstart', e => {
            e.preventDefault();
            triggerMove(key, true);
        }, { passive: false });
        btn.addEventListener('touchend', e => {
            e.preventDefault();
            triggerMove(key, false);
        }, { passive: false });
        btn.addEventListener('touchcancel', e => {
            e.preventDefault();
            triggerMove(key, false);
        }, { passive: false });
    });

    // Up/Down buttons (right)
    document.querySelectorAll('#mobile-updown .move-btn').forEach(btn => {
        const move = btn.getAttribute('data-move');
        if (!moveMap[move]) return;
        const key = moveMap[move].key;
        btn.addEventListener('touchstart', e => {
            e.preventDefault();
            triggerMove(key, true);
        }, { passive: false });
        btn.addEventListener('touchend', e => {
            e.preventDefault();
            triggerMove(key, false);
        }, { passive: false });
        btn.addEventListener('touchcancel', e => {
            e.preventDefault();
            triggerMove(key, false);
        }, { passive: false });
    });
}

// Event listeners
document.addEventListener('keydown', (e) => movementController.handleKeyDown(e));
document.addEventListener('keyup', (e) => movementController.handleKeyUp(e));
document.addEventListener('wheel', (e) => {
    movementController.handleWheel(e);
    cameraController.handleWheel(e);
});
document.addEventListener('mousedown', (e) => cameraController.handleMouseDown(e));
document.addEventListener('mousemove', (e) => cameraController.handleMouseMove(e));
document.addEventListener('mouseup', () => cameraController.handleMouseUp());

// Touch events are now handled by TouchController
// The TouchController will handle both single-touch drag and two-finger pinch

// Handle window resize and orientation change
const handleResize = () => {
    console.log("resize: handleResize");
    
    // Get the actual viewport size
    const width = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    const height = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
    
    // Get device pixel ratio
    const pixelRatio = window.devicePixelRatio || 1;
    
    // Update camera aspect ratio
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    
    // Update renderer size with pixel ratio
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    
    // Update label renderer
    labelManager.handleResize();
    
    // Force canvas to fill viewport
    renderer.domElement.style.width = '100vw';
    renderer.domElement.style.height = '100vh';
    renderer.domElement.style.position = 'fixed';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
};

// Initial resize
handleResize();

window.addEventListener('resize', handleResize);
window.addEventListener('orientationchange', () => {
    console.log("resize: orientationchange");
    // Add a small delay to ensure the orientation change is complete
    setTimeout(handleResize, 300);
});

// Animation loop
function animate() {
    const currentTime = performance.now();
    frameCount++;
    
    if (currentTime - lastTime >= 1000) {
        fps = frameCount;
        frameCount = 0;
        lastTime = currentTime;
        fpsDisplay.textContent = `FPS: ${fps}`;
    }

    cameraController.update();
    movementController.update();
    labelManager.update();
    renderer.render(scene, camera);
}

// Load 3D model
const loader = new GLTFLoader();
loader.load('school.glb', (gltf) => {
    const root = gltf.scene;
    const mesh = root.children[0];

    if (mesh.isMesh) {
        const geometry = mesh.geometry;
        geometry.attributes.position.setUsage(THREE.StaticDrawUsage);
    }
    
    root.traverse((node) => {
        if (node.isMesh) {
            if (node.material) {
                const oldMat = node.material;

                const texture = oldMat.map || null;
                const normalMap = oldMat.normalMap || null;

                // Set nearest neighbor filtering for all textures
                if (texture) {
                    texture.minFilter = THREE.NearestFilter;
                    texture.magFilter = THREE.NearestFilter;
                    texture.needsUpdate = true;
                }
                if (normalMap) {
                    normalMap.minFilter = THREE.NearestFilter;
                    normalMap.magFilter = THREE.NearestFilter;
                    normalMap.needsUpdate = true;
                }
          
                // Use MeshLambertMaterial for better shading while maintaining performance
                node.material = new THREE.MeshLambertMaterial({
                    map: texture,
                    normalMap: normalMap,
                    normalScale: new THREE.Vector2(1, 1),  // Adjust normal map intensity
                    transparent: oldMat.transparent,
                    opacity: oldMat.opacity,
                    alphaTest: oldMat.alphaTest,
                    depthWrite: oldMat.depthWrite
                });

                node.material.side = THREE.FrontSide;
            }
        }
    });
    
    scene.add(root);

    // Set up first person camera after model is loaded
    cameraController.setupFirstPersonCamera();

    // Create all labels from constants
    Object.values(LABEL_INFO).forEach(labelInfo => {
        labelManager.createLabel(labelInfo.name, labelInfo.position, '', labelInfo.color);
    });
});

// Start animation loop
renderer.setAnimationLoop(animate);

// Prevent pull-to-refresh on mobile when dragging the map in overview mode
renderer.domElement.addEventListener('touchmove', function(e) {
    if (cameraController.isDragging) {
        e.preventDefault();
    }
}, { passive: false });