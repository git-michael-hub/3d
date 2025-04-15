import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Debug information
console.log('Three.js version:', THREE.REVISION);
console.log('Setting up scene...');

// Custom WebGL detection function
function isWebGLAvailable() {
    try {
        const canvas = document.createElement('canvas');
        return !!(window.WebGLRenderingContext && 
            (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch (e) {
        return false;
    }
}

// Check for WebGL support
if (!isWebGLAvailable()) {
    const warning = document.createElement('div');
    warning.style.position = 'absolute';
    warning.style.top = '50%';
    warning.style.left = '50%';
    warning.style.transform = 'translate(-50%, -50%)';
    warning.style.padding = '20px';
    warning.style.background = 'red';
    warning.style.color = 'white';
    warning.style.fontFamily = 'Arial, sans-serif';
    warning.textContent = 'WebGL is not available on your browser or device.';
    document.body.appendChild(warning);
    throw new Error('WebGL not available');
}

// Create scene, camera, and renderer
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000); // Set a black background to make sure it's visible
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

console.log('Renderer created, canvas added to body');

// Set camera position
camera.position.z = 7;

// Add orbit controls for interactive 3D rotation
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enableZoom = true;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.5;

// Set distance limits to prevent zooming too far in or out
controls.minDistance = 5;
controls.maxDistance = 20;

// Prevent panning which can move objects out of view
controls.enablePan = false;

// Add instruction text
const instructionDiv = document.createElement('div');
instructionDiv.style.position = 'absolute';
instructionDiv.style.bottom = '20px';
instructionDiv.style.left = '20px';
instructionDiv.style.color = 'white';
instructionDiv.style.fontFamily = 'Arial, sans-serif';
instructionDiv.style.padding = '10px';
instructionDiv.style.background = 'rgba(0, 0, 0, 0.5)';
instructionDiv.style.borderRadius = '5px';
instructionDiv.style.zIndex = '100';
instructionDiv.style.userSelect = 'none';
instructionDiv.innerHTML = 'Mouse: Drag to rotate, Scroll to zoom<br>Press spacebar to toggle auto-rotation';
document.body.appendChild(instructionDiv);

// Create a simple cube to test rendering
const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
const cubeMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
scene.add(cube);

// Render the cube once to make sure something is visible
renderer.render(scene, camera);
console.log('Initial cube rendered');

// Create image planes - we'll use a grid of planes for the animation effect
const imageUrl = 'images/image.jpg'; // Change this to your image path
const textureLoader = new THREE.TextureLoader();

console.log('Loading texture from:', imageUrl);

// Load the image texture
textureLoader.load(
    // URL
    imageUrl,
    
    // onLoad callback
    (texture) => {
        console.log('Texture loaded successfully', texture);
        scene.remove(cube); // Remove the test cube
        
        // Make the texture repeat for spherical mapping
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(1, 1);
        
        // Create 3D geometries
        const sphereGeometry = new THREE.SphereGeometry(3, 64, 64);
        const cylinderGeometry = new THREE.CylinderGeometry(2, 2, 6, 64, 64, true);
        const torusGeometry = new THREE.TorusGeometry(3, 1, 32, 64);
        
        // Create material with custom shader for 3D animation
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                imageTexture: { value: texture }
            },
            vertexShader: `
                varying vec2 vUv;
                uniform float time;
                
                void main() {
                    vUv = uv;
                    
                    // Create a more dramatic 3D wave effect
                    vec3 newPosition = position;
                    float displacement = sin(position.x * 3.0 + time) * 0.3 + 
                                       cos(position.y * 2.0 + time * 0.8) * 0.3 +
                                       sin(position.z * 4.0 + time * 0.5) * 0.3;
                    
                    // Apply the displacement in all directions for a more 3D effect
                    newPosition += normal * displacement;
                    
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D imageTexture;
                varying vec2 vUv;
                uniform float time;
                
                void main() {
                    // Slightly distort UVs for a liquid effect
                    vec2 distortedUV = vUv;
                    distortedUV.x += sin(vUv.y * 10.0 + time * 0.5) * 0.03;
                    distortedUV.y += cos(vUv.x * 10.0 + time * 0.5) * 0.03;
                    
                    vec4 color = texture2D(imageTexture, distortedUV);
                    
                    // Apply dynamic color shifting
                    color.r += sin(time * 0.2 + vUv.x * 5.0) * 0.15;
                    color.g += cos(time * 0.3 + vUv.y * 5.0) * 0.15;
                    color.b += sin(time * 0.4 + (vUv.x + vUv.y) * 5.0) * 0.15;
                    
                    gl_FragColor = color;
                }
            `,
            side: THREE.DoubleSide // To see inside and outside
        });

        // Create the 3D objects
        const sphere = new THREE.Mesh(sphereGeometry, material);
        sphere.position.set(-4.5, 0, 0);
        scene.add(sphere);
        
        const cylinder = new THREE.Mesh(cylinderGeometry, material);
        cylinder.position.set(0, 0, 0);
        cylinder.rotation.x = Math.PI / 2;
        scene.add(cylinder);
        
        const torus = new THREE.Mesh(torusGeometry, material);
        torus.position.set(4.5, 0, 0);
        scene.add(torus);
        
        // Group to hold all shapes
        const group = new THREE.Group();
        group.add(sphere);
        group.add(cylinder);
        group.add(torus);
        scene.add(group);
        
        console.log('Added 3D objects to scene');

        // Set up post-processing
        const composer = new EffectComposer(renderer);
        const renderPass = new RenderPass(scene, camera);
        composer.addPass(renderPass);

        // Add bloom effect
        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            0.7,    // strength
            0.4,    // radius
            0.85    // threshold
        );
        composer.addPass(bloomPass);
        console.log('Post-processing setup complete');
        
        // Toggle autorotation on spacebar press
        document.addEventListener('keydown', function(event) {
            if (event.code === 'Space') {
                controls.autoRotate = !controls.autoRotate;
            }
        });

        // Animation loop
        function animate() {
            requestAnimationFrame(animate);
            
            // Update controls
            controls.update();
            
            // Update time uniform for animation
            material.uniforms.time.value += 0.01;
            
            // Additional rotation for the group
            group.rotation.y += 0.002;
            
            // Render the scene with post-processing
            composer.render();
        }

        console.log('Starting animation loop');
        animate();

        // Handle window resize
        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
            composer.setSize(window.innerWidth, window.innerHeight);
            console.log('Window resized, updated renderer');
        });
    },
    
    // onProgress callback
    (xhr) => {
        console.log(`Texture ${(xhr.loaded / xhr.total * 100)}% loaded`);
    },
    
    // onError callback
    (error) => {
        console.error('Error loading texture:', error);
        // Display error on screen
        const errorDiv = document.createElement('div');
        errorDiv.style.position = 'absolute';
        errorDiv.style.top = '50%';
        errorDiv.style.left = '50%';
        errorDiv.style.transform = 'translate(-50%, -50%)';
        errorDiv.style.padding = '20px';
        errorDiv.style.background = 'red';
        errorDiv.style.color = 'white';
        errorDiv.style.fontFamily = 'Arial, sans-serif';
        errorDiv.textContent = 'Failed to load image. Please check the console for details.';
        document.body.appendChild(errorDiv);
    }
);

// Add ambient light
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

// Add directional light
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(1, 1, 1);
scene.add(directionalLight);

// Fallback animation in case the image doesn't load but no error is triggered
function fallbackAnimate() {
    requestAnimationFrame(fallbackAnimate);
    if (cube) {
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;
    }
    renderer.render(scene, camera);
}

// Start the fallback animation to ensure something is visible
fallbackAnimate(); 