import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { TeapotGeometry } from 'three/addons/geometries/TeapotGeometry.js';

// Global variables
let container, stats;
let camera, scene, renderer, controls;
let mesh, composer, clock;
let uniforms;
let autoRotate = true;
let flowSpeed = 1.0;
let glowIntensity = 0.8;
let turbulence = 2.0;
let darkness = 0.0; // New darkness parameter
let exposure = 1.0; // New exposure parameter
let contrast = 1.0; // New contrast parameter
let saturation = 1.0; // New saturation parameter
let sharpness = 0.0;  // New sharpness parameter
let crystalMode = 0.0; // New crystal turbulence mode
let crystalScale = 4.0; // Crystal scale parameter
let turbulenceMode = 'standard'; // Turbulence mode: 'standard', 'crystal', 'moon'
let stars; // Particle system for stars
let loadingManager, loadingStatus = { loaded: 0, total: 2 };
let lastCalledTime, fps;
let bloomPass; // Add bloomPass as a global variable

// Add smooth zooming variables
let targetZoom = 4; // Initial target zoom distance
let currentZoomVelocity = 0;
const ZOOM_FRICTION = 0.9; // Higher value = less friction
const ZOOM_RESPONSIVENESS = 0.15; // Lower value = smoother but slower response

// Panel toggle variables - ensure they're defined at global scope
let controlsPanelVisible = true;
let infoPanelVisible = true;

// Track loaded assets - moved here before use
let loadedAssets = 0;
const totalAssets = 2; // Two textures

// Define geometries in global scope
let geometries;
let currentGeometryIndex = 0;

// Theme configurations
const themes = {
    lava: {
        fogColor: new THREE.Vector3(0.5, 0.1, 0.1),
        textureScale: new THREE.Vector2(3.0, 1.0),
        glowMultiplier: 0.8,
        backgroundColor: 0x000000
    },
    toxic: {
        fogColor: new THREE.Vector3(0.1, 0.5, 0.1),
        textureScale: new THREE.Vector2(3.0, 1.0),
        glowMultiplier: 0.8,
        backgroundColor: 0x000000
    },
    ocean: {
        fogColor: new THREE.Vector3(0.1, 0.1, 0.5),
        textureScale: new THREE.Vector2(3.0, 1.0),
        glowMultiplier: 0.7,
        backgroundColor: 0x000000
    },
    moon: {
        fogColor: new THREE.Vector3(0.2, 0.2, 0.3),
        textureScale: new THREE.Vector2(2.0, 2.0),
        glowMultiplier: 0.5,
        backgroundColor: 0x000011
    },
    inferno: {
        fogColor: new THREE.Vector3(0.8, 0.1, 0.0),
        textureScale: new THREE.Vector2(2.5, 1.5),
        glowMultiplier: 1.2,
        backgroundColor: 0x100000
    },
    electric: {
        fogColor: new THREE.Vector3(0.2, 0.1, 0.8),
        textureScale: new THREE.Vector2(2.0, 1.5),
        glowMultiplier: 1.5,
        backgroundColor: 0x000022
    },
    emerald: {
        fogColor: new THREE.Vector3(0.0, 0.3, 0.1),
        textureScale: new THREE.Vector2(2.2, 1.0),
        glowMultiplier: 0.7,
        backgroundColor: 0x001100
    },
    sunset: {
        fogColor: new THREE.Vector3(0.6, 0.2, 0.1),
        textureScale: new THREE.Vector2(3.5, 1.2),
        glowMultiplier: 0.8,
        backgroundColor: 0x110800
    },
    desert: {
        fogColor: new THREE.Vector3(0.6, 0.4, 0.1),
        textureScale: new THREE.Vector2(4.0, 1.0),
        glowMultiplier: 0.6,
        backgroundColor: 0x221100
    },
    arctic: {
        fogColor: new THREE.Vector3(0.3, 0.4, 0.6),
        textureScale: new THREE.Vector2(2.5, 1.8),
        glowMultiplier: 0.5,
        backgroundColor: 0x112233
    }
};

// Set current theme
let currentTheme = 'lava';

// Initialize the scene
init();

function init() {
    container = document.createElement('div');
    document.body.appendChild(container);

    clock = new THREE.Clock();

    // Lava shader material uniforms - MOVED UP before scene creation
    uniforms = {
        'fogDensity': { value: 0.45 },
        'fogColor': { value: new THREE.Vector3(0, 0, 0) },
        'time': { value: 1.0 },
        'uvScale': { value: new THREE.Vector2(3.0, 1.0) },
        'texture1': { value: null },
        'texture2': { value: null },
        'resolution': { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        'turbulence': { value: 3.0 },
        'flowSpeed': { value: 1.0 },
        'darkness': { value: 0.0 }, // Darkness uniform
        'exposure': { value: 1.0 }, // Exposure uniform
        'contrast': { value: 1.0 },  // Contrast uniform
        'saturation': { value: 1.0 }, // Add saturation uniform
        'sharpness': { value: 0.0 },  // Add sharpness uniform
        'crystalMode': { value: 0.0 }, // Crystal mode (0.0 = off, 1.0 = on)
        'crystalScale': { value: 4.0 },  // Crystal pattern scale
        'turbulenceMode': { value: 0 }  // Turbulence mode (0 = standard, 1 = crystal, 2 = moon)
    };
    
    // Create scene before applying theme
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.FogExp2(0x000000, uniforms.fogDensity.value);

    // Now apply the theme after scene is created
    applyTheme(currentTheme);

    // Create camera with better near/far planes for smoother zoom
    camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 3000);
    camera.position.z = 4;

    // Add lights
    const pointLight = new THREE.PointLight(0xffffff, 2, 0);
    pointLight.position.set(0, 0, 100);
    scene.add(pointLight);

    // Create loading manager
    loadingManager = new THREE.LoadingManager();
    loadingManager.onLoad = () => {
        document.getElementById('loading-screen').style.display = 'none';
        animate();
    };
    loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
        loadingStatus.loaded = itemsLoaded;
        loadingStatus.total = itemsTotal;
        updateLoadingStatus();
    };

    // Load textures
    const textureLoader = new THREE.TextureLoader(loadingManager);
    
    textureLoader.load('https://threejs.org/examples/textures/lava/cloud.png', function(texture) {
        uniforms['texture1'].value = texture;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        updateLoadingStatus();
    });

    textureLoader.load('https://threejs.org/examples/textures/lava/lavatile.jpg', function(texture) {
        uniforms['texture2'].value = texture;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        updateLoadingStatus();
    });

    // Lava shader material
    const material = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: `
            uniform vec2 uvScale;
            varying vec2 vUv;

            void main() {
                vUv = uvScale * uv;
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            uniform float time;
            uniform float turbulence;
            uniform float flowSpeed;
            uniform float fogDensity;
            uniform float darkness;
            uniform float exposure;
            uniform float contrast;
            uniform float saturation;
            uniform float sharpness;
            uniform float crystalMode;
            uniform float crystalScale;
            uniform int turbulenceMode;
            uniform vec3 fogColor;
            uniform sampler2D texture1;
            uniform sampler2D texture2;
            uniform vec2 resolution;
            
            varying vec2 vUv;
            
            // Function to convert RGB to grayscale
            float rgb2gray(vec3 color) {
                return dot(color, vec3(0.299, 0.587, 0.114));
            }
            
            // Crystal noise function - creates sharp cellular/crystal-like patterns
            vec2 crystalNoise(vec2 p) {
                // Grid-based hash function
                vec2 ip = floor(p);
                vec2 fp = fract(p);
                
                float d = 1.0e10;
                vec2 closest = vec2(0.0);
                
                // Find the closest feature point in a 3x3 neighborhood
                for (int i = -1; i <= 1; i++) {
                    for (int j = -1; j <= 1; j++) {
                        vec2 offset = vec2(float(i), float(j));
                        
                        // Generate pseudo-random position for this cell
                        vec2 pos = offset + 0.5 + 0.5 * sin(vec2(
                            dot(ip + offset, vec2(123.4, 374.3)),
                            dot(ip + offset, vec2(127.1, 337.7))
                        ) + time * 0.5);
                        
                        float dist = length(fp - pos);
                        
                        if (dist < d) {
                            d = dist;
                            closest = pos;
                        }
                    }
                }
                
                // Return both the distance and the position for varied effects
                return vec2(d, length(closest));
            }
            
            // Moon noise function - creates crater-like patterns with subtle glow
            float moonNoise(vec2 p) {
                // Base noise for crater positioning
                float n = 0.0;
                
                // Add several noise layers for complex crater distribution
                for (int i = 0; i < 5; i++) {
                    float scale = pow(2.0, float(i));
                    float amplitude = pow(0.5, float(i));
                    
                    vec2 np = p * scale;
                    vec2 ip = floor(np);
                    vec2 fp = fract(np);
                    
                    // Generate pseudo-random craters
                    for (int x = -1; x <= 1; x++) {
                        for (int y = -1; y <= 1; y++) {
                            vec2 offset = vec2(float(x), float(y));
                            vec2 neighbor = ip + offset;
                            
                            // Random crater center
                            vec2 crater = offset + 0.5 + 0.5 * sin(vec2(
                                dot(neighbor, vec2(123.4, 374.3)),
                                dot(neighbor, vec2(127.1, 337.7))
                            ) * 0.1);
                            
                            // Random crater size
                            float craterSize = 0.1 + 0.3 * sin(dot(neighbor, vec2(45.1, 98.7)));
                            
                            // Distance to crater
                            float dist = length(fp - crater) / craterSize;
                            
                            // Crater rim effect (raised edges with depression in center)
                            float rim = smoothstep(0.8, 1.0, dist) - smoothstep(0.0, 0.8, dist) * 0.5;
                            n += rim * amplitude;
                        }
                    }
                }
                
                // Add gentle overall waves for lunar mare areas
                n += sin(p.x * 0.5 + time * 0.1) * sin(p.y * 0.3) * 0.1;
                
                return n;
            }
            
            void main() {
                vec2 position = vUv * 8.0;
                float speed = time * flowSpeed;
                
                // Sample noise texture
                float noise = texture2D(texture1, position / 8.0 - vec2(0.0, speed / 10.0)).r;
                
                // Choose turbulence type based on mode
                vec2 turbulenceOffset;
                
                if (turbulenceMode == 1) {
                    // Crystal turbulence mode
                    vec2 crystalNoiseValue = crystalNoise(position * crystalScale * 0.05 + speed * 0.1);
                    float crystalPattern = pow(crystalNoiseValue.x, 0.5) * turbulence * 0.15;
                    
                    // Create sharp-edged crystalline distortion
                    turbulenceOffset = vec2(
                        crystalPattern * sin(position.y * 0.1 + crystalNoiseValue.y * 6.28),
                        crystalPattern * sin(position.x * 0.1 + crystalNoiseValue.y * 6.28)
                    );
                } 
                else if (turbulenceMode == 2) {
                    // Moon turbulence mode - crater-like patterns
                    float moonPattern = moonNoise(position * 0.1 + speed * 0.05) * turbulence * 0.15;
                    
                    // Create more subtle, rounded distortion with crater-like bumps
                    turbulenceOffset = vec2(
                        moonPattern * cos(position.y * 0.05),
                        moonPattern * sin(position.x * 0.05)
                    );
                }
                else {
                    // Regular smooth turbulence
                    turbulenceOffset = vec2(
                        sin(position.y * 0.1 + speed + noise * turbulence) * 0.2,
                        sin(position.x * 0.1 + speed + noise * turbulence) * 0.2
                    );
                }
                
                // Get texture UV coordinates
                vec2 texCoord = position / 8.0 + turbulenceOffset;
                
                // Mix lava texture with distortion
                vec4 color = texture2D(texture2, texCoord);
                
                // Enhanced glow effect - stronger and more prominent
                float glowStrength = noise * 3.0;
                vec4 glowColor = vec4(0.9, 0.4, 0.1, 1.0); // Brighter orange/red for better bloom
                color += glowColor * glowStrength;
                
                // Boost bright areas for better bloom effect
                color.rgb = pow(color.rgb, vec3(0.85)); // Gamma adjustment to enhance bright areas
                
                // Apply exposure adjustment (multiply)
                color.rgb = color.rgb * exposure;
                
                // Apply contrast adjustment
                color.rgb = (color.rgb - 0.5) * contrast + 0.5;
                
                // Apply saturation adjustment
                float gray = rgb2gray(color.rgb);
                color.rgb = mix(vec3(gray), color.rgb, saturation);
                
                // Apply sharpness (unsharp mask technique with fixed sampling distance)
                if (sharpness > 0.0) {
                    // Use a fixed sample distance in texture space rather than screen space
                    float sampleDistance = 0.005;
                    
                    // Sample neighboring pixels with fixed distance
                    vec4 n1 = texture2D(texture2, texCoord + vec2(sampleDistance, 0.0));
                    vec4 n2 = texture2D(texture2, texCoord + vec2(-sampleDistance, 0.0));
                    vec4 n3 = texture2D(texture2, texCoord + vec2(0.0, sampleDistance));
                    vec4 n4 = texture2D(texture2, texCoord + vec2(0.0, -sampleDistance));
                    
                    // Calculate laplacian
                    vec4 laplacian = 4.0 * color - n1 - n2 - n3 - n4;
                    
                    // Apply sharpening
                    color += laplacian * sharpness;
                }
                
                // Apply special effects based on turbulence mode
                if (turbulenceMode == 1) {
                    // Crystal highlight effect when in crystal mode
                    vec2 crystalNoiseValue = crystalNoise(position * crystalScale * 0.05 + speed * 0.1);
                    
                    // Create crystal edge highlights
                    float edge = smoothstep(0.2, 0.22, crystalNoiseValue.x);
                    
                    // Add crystal highlights to the color
                    color.rgb += vec3(1.0, 1.0, 1.0) * edge * 0.5;
                }
                else if (turbulenceMode == 2) {
                    // Moon dust and crater glow effect
                    float moonPattern = moonNoise(position * 0.1 + speed * 0.05);
                    
                    // Create subtle blue-white glow on crater rims
                    float craterGlow = smoothstep(0.1, 0.2, moonPattern);
                    color.rgb = mix(color.rgb, vec3(0.8, 0.9, 1.0), craterGlow * 0.3);
                    
                    // Darken crater centers
                    float craterDepth = smoothstep(0.0, 0.1, moonPattern);
                    color.rgb = mix(vec3(0.1, 0.1, 0.15), color.rgb, craterDepth);
                }
                
                // Apply darkness filter (after other adjustments)
                color.rgb = mix(color.rgb, vec3(0.0), darkness);
                
                // Apply fog
                float depth = gl_FragCoord.z / gl_FragCoord.w;
                float fogFactor = 1.0 - exp(-fogDensity * depth);
                gl_FragColor = mix(color, vec4(fogColor, 1.0), fogFactor);
            }
        `,
        transparent: true
    });

    // Initialize geometries array in the global scope
    geometries = [
        new THREE.TorusGeometry(0.65, 0.3, 64, 128),
        new THREE.IcosahedronGeometry(1, 8),
        new THREE.SphereGeometry(1, 64, 64),
        new THREE.BoxGeometry(1, 1, 1, 10, 10, 10),
        new TeapotGeometry(0.7, 10),
        new THREE.TorusKnotGeometry(0.6, 0.25, 128, 32),
        // Sacred Geometry
        createMerkaba(1.2), // Star Tetrahedron (Merkaba)
        createFlowerOfLife(1.2), // Flower of Life pattern
        createMetatronsCube(1.2), // Metatron's Cube
        createSriYantra(1.2), // Sri Yantra
        createPlatonic(1.2, 'dodecahedron'), // Dodecahedron (Platonic solid)
        // Biology
        createCell(1.2), // Biological Cell
        createEye(1.2), // Human Eye
        createFlowerOfLifeSphere(1.2) // Flower of Life inside a Sphere
    ];
    
    const geometry = geometries[currentGeometryIndex];
    mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = 0.3;
    scene.add(mesh);

    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);

    // Create post-processing effects
    const renderScene = new RenderPass(scene, camera);
    
    // Configure bloom pass with more pronounced effect
    bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        glowIntensity,  // Strength
        0.75,           // Radius - increased from 0.4
        0.4             // Threshold - decreased from 0.85
    );
    
    composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    // Create controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1; // Increased from 0.05 for smoother motion
    controls.zoomSpeed = 0.6; // Reduce zoom speed for smoother zoom
    controls.minDistance = 2;
    controls.maxDistance = 10;
    controls.rotateSpeed = 0.8; // Slightly reduced for more controlled rotation
    controls.enableZoom = true;
    controls.enablePan = true;
    controls.panSpeed = 0.8; // Controlled panning speed
    controls.minPolarAngle = 0; // Allow full vertical rotation
    controls.maxPolarAngle = Math.PI; // Allow full vertical rotation
    
    // Disable the built-in zooming of OrbitControls
    controls.enableZoom = false;
    
    // Add custom zoom handler
    renderer.domElement.addEventListener('wheel', function(event) {
        event.preventDefault();
        
        // Normalize scroll delta and make it smaller for finer control
        const delta = -Math.sign(event.deltaY) * 0.15;
        
        // Update the target zoom with constraints
        targetZoom = Math.max(controls.minDistance, Math.min(controls.maxDistance, targetZoom - delta));
    }, { passive: false });
    
    // Initialize target zoom to match camera's initial position
    targetZoom = camera.position.z;
    
    controls.update();

    // Setup UI controls
    setupControls();

    // Read initial values from sliders
    const flowSpeedSlider = document.getElementById('flow-speed');
    const glowIntensitySlider = document.getElementById('glow-intensity');
    const turbulenceSlider = document.getElementById('turbulence');
    const darknessSlider = document.getElementById('darkness');
    const exposureSlider = document.getElementById('exposure');
    const contrastSlider = document.getElementById('contrast');
    const saturationSlider = document.getElementById('saturation');
    const sharpnessSlider = document.getElementById('sharpness');
    
    if (flowSpeedSlider) {
        uniforms['flowSpeed'].value = parseFloat(flowSpeedSlider.value);
    }
    
    if (glowIntensitySlider) {
        // Just set the initial value, don't add an event listener here
        bloomPass.strength = parseFloat(glowIntensitySlider.value);
    }
    
    if (turbulenceSlider) {
        uniforms['turbulence'].value = parseFloat(turbulenceSlider.value);
        uniforms['uvScale'].value.set(parseFloat(turbulenceSlider.value), 1.0);
    }
    
    if (darknessSlider) {
        uniforms['darkness'].value = parseFloat(darknessSlider.value);
    }
    
    if (exposureSlider) {
        uniforms['exposure'].value = parseFloat(exposureSlider.value);
    }
    
    if (contrastSlider) {
        uniforms['contrast'].value = parseFloat(contrastSlider.value);
    }
    
    if (saturationSlider) {
        uniforms['saturation'].value = parseFloat(saturationSlider.value);
    }
    
    if (sharpnessSlider) {
        uniforms['sharpness'].value = parseFloat(sharpnessSlider.value);
    }

    // Handle window resize
    window.addEventListener('resize', onWindowResize);

    // Add keyboard controls
    window.addEventListener('keydown', onKeyDown);

    // Create stars (initially invisible)
    createStars();

    // Add this line at the end of the init function
    setupPanelToggles();
    
    animate();
}

// Track loaded assets
function updateLoadingStatus() {
    loadedAssets++;
    
    if (loadedAssets === totalAssets) {
        // Hide loading screen when all assets are loaded
        document.getElementById('loading-screen').style.display = 'none';
    }
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
    
    // Update resolution uniform when window is resized
    if (uniforms['resolution']) {
        uniforms['resolution'].value.set(window.innerWidth, window.innerHeight);
    }
    
    // Force a re-render after resize for smooth update
    if (composer) {
        composer.render();
    }
}

// Setup UI controls
function setupControls() {
    // Flow Speed Slider
    const flowSpeedSlider = document.getElementById('flow-speed');
    const flowSpeedValue = document.getElementById('flow-speed-value');
    
    if (flowSpeedSlider && flowSpeedValue) {
        flowSpeedSlider.addEventListener('input', () => {
            const value = parseFloat(flowSpeedSlider.value);
            flowSpeedValue.textContent = value.toFixed(1);
            if (uniforms) {
                uniforms.flowSpeed.value = value;
            }
        });
    }
    
    // Glow Intensity Slider
    const glowIntensitySlider = document.getElementById('glow-intensity');
    const glowIntensityValue = document.getElementById('glow-intensity-value');
    
    if (glowIntensitySlider && glowIntensityValue) {
        glowIntensitySlider.addEventListener('input', () => {
            const value = parseFloat(glowIntensitySlider.value);
            glowIntensityValue.textContent = value.toFixed(1);
            if (bloomPass) {
                bloomPass.strength = value;
            }
        });
    }
    
    // Turbulence Slider
    const turbulenceSlider = document.getElementById('turbulence');
    const turbulenceValue = document.getElementById('turbulence-value');
    
    if (turbulenceSlider && turbulenceValue) {
        turbulenceSlider.addEventListener('input', () => {
            const value = parseFloat(turbulenceSlider.value);
            turbulenceValue.textContent = value.toFixed(1);
            if (uniforms) {
                uniforms.turbulence.value = value;
            }
        });
    }

    // Geometry Selector
    const geometrySelect = document.getElementById('geometry-select');
    if (geometrySelect) {
        geometrySelect.addEventListener('change', () => {
            const index = parseInt(geometrySelect.value);
            changeGeometry(index);
        });
    }
    
    // Theme Selector
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
        themeSelect.addEventListener('change', () => {
            const themeName = themeSelect.value;
            applyTheme(themeName);
        });
    }

    // Turbulence Mode Selector buttons
    const standardButton = document.getElementById('standard-mode');
    const crystalButton = document.getElementById('crystal-mode');
    const moonButton = document.getElementById('moon-mode');
    
    if (standardButton) {
        standardButton.addEventListener('click', () => {
            if (uniforms) {
                uniforms.turbulenceMode.value = 0;
            }
            
            // Also update the theme to match the mode
            if (currentTheme !== 'lava') {
                applyTheme('lava');
            } else {
                // Just update the buttons
                if (standardButton && crystalButton && moonButton) {
                    standardButton.classList.add('active');
                    crystalButton.classList.remove('active');
                    moonButton.classList.remove('active');
                }
                
                // Update the crystal mode checkbox to match
                const crystalModeToggle = document.getElementById('crystal-mode-checkbox');
                const crystalModeCheckbox = crystalModeToggle || document.getElementById('crystal-mode');
                if (crystalModeCheckbox && crystalModeCheckbox.type === 'checkbox') {
                    crystalModeCheckbox.checked = false;
                }
            }
        });
    }
    
    if (crystalButton) {
        crystalButton.addEventListener('click', () => {
            if (uniforms) {
                uniforms.turbulenceMode.value = 1;
            }
            
            // Also update the theme to match the mode
            if (currentTheme !== 'toxic') {
                applyTheme('toxic');
            } else {
                // Just update the buttons
                if (standardButton && crystalButton && moonButton) {
                    standardButton.classList.remove('active');
                    crystalButton.classList.add('active');
                    moonButton.classList.remove('active');
                }
                
                // Update the crystal mode checkbox to match
                const crystalModeToggle = document.getElementById('crystal-mode-checkbox');
                const crystalModeCheckbox = crystalModeToggle || document.getElementById('crystal-mode');
                if (crystalModeCheckbox && crystalModeCheckbox.type === 'checkbox') {
                    crystalModeCheckbox.checked = true;
                }
            }
        });
    }
    
    if (moonButton) {
        moonButton.addEventListener('click', () => {
            if (uniforms) {
                uniforms.turbulenceMode.value = 2;
            }
            
            // Also update the theme to match the mode
            if (currentTheme !== 'moon') {
                applyTheme('moon');
            } else {
                // Just update the buttons
                if (standardButton && crystalButton && moonButton) {
                    standardButton.classList.remove('active');
                    crystalButton.classList.remove('active');
                    moonButton.classList.add('active');
                }
                
                // Update the crystal mode checkbox to match (should be off for moon mode)
                const crystalModeToggle = document.getElementById('crystal-mode-checkbox');
                const crystalModeCheckbox = crystalModeToggle || document.getElementById('crystal-mode');
                if (crystalModeCheckbox && crystalModeCheckbox.type === 'checkbox') {
                    crystalModeCheckbox.checked = false;
                }
            }
        });
    }
    
    // Auto-rotate Checkbox
    const autoRotateCheckbox = document.getElementById('auto-rotate');
    
    if (autoRotateCheckbox) {
        autoRotateCheckbox.checked = autoRotate;
        
        autoRotateCheckbox.addEventListener('change', () => {
            autoRotate = autoRotateCheckbox.checked;
        });
    }
    
    // Crystal Mode Checkbox - update to work with the mode buttons
    const crystalModeToggle = document.getElementById('crystal-mode-checkbox');
    
    // If we can't find the checkbox with ID 'crystal-mode-checkbox', try 'crystal-mode'
    // as that's what's defined in the HTML
    const crystalModeCheckbox = crystalModeToggle || document.getElementById('crystal-mode');
    
    if (crystalModeCheckbox && crystalModeCheckbox.type === 'checkbox') {
        // Initial state
        crystalModeCheckbox.checked = (uniforms && uniforms.turbulenceMode.value === 1);
        
        crystalModeCheckbox.addEventListener('change', () => {
            if (crystalModeCheckbox.checked) {
                // Activate crystal mode
                if (uniforms) {
                    uniforms.turbulenceMode.value = 1;
                    if (uniforms.crystalMode) {
                        uniforms.crystalMode.value = 1.0;
                    }
                }
                
                if (standardButton && crystalButton && moonButton) {
                    standardButton.classList.remove('active');
                    crystalButton.classList.add('active');
                    moonButton.classList.remove('active');
                }
                
                if (currentTheme !== 'toxic') {
                    applyTheme('toxic');
                }
            } else {
                // Deactivate crystal mode, revert to standard
                if (uniforms) {
                    uniforms.turbulenceMode.value = 0;
                    if (uniforms.crystalMode) {
                        uniforms.crystalMode.value = 0.0;
                    }
                }
                
                if (standardButton && crystalButton && moonButton) {
                    standardButton.classList.add('active');
                    crystalButton.classList.remove('active');
                    moonButton.classList.remove('active');
                }
                
                if (currentTheme !== 'lava') {
                    applyTheme('lava');
                }
            }
        });
    }
    
    // Add listeners for other controls if they exist
    const darknessSlider = document.getElementById('darkness');
    const darknessValue = document.getElementById('darkness-value');
    if (darknessSlider && darknessValue) {
        darknessSlider.addEventListener('input', () => {
            const value = parseFloat(darknessSlider.value);
            darknessValue.textContent = value.toFixed(1);
            uniforms.darkness.value = value;
        });
    }
    
    const exposureSlider = document.getElementById('exposure');
    const exposureValue = document.getElementById('exposure-value');
    if (exposureSlider && exposureValue) {
        exposureSlider.addEventListener('input', () => {
            const value = parseFloat(exposureSlider.value);
            exposureValue.textContent = value.toFixed(1);
            uniforms.exposure.value = value;
        });
    }
    
    const contrastSlider = document.getElementById('contrast');
    const contrastValue = document.getElementById('contrast-value');
    if (contrastSlider && contrastValue) {
        contrastSlider.addEventListener('input', () => {
            const value = parseFloat(contrastSlider.value);
            contrastValue.textContent = value.toFixed(1);
            uniforms.contrast.value = value;
        });
    }
    
    const saturationSlider = document.getElementById('saturation');
    const saturationValue = document.getElementById('saturation-value');
    if (saturationSlider && saturationValue) {
        saturationSlider.addEventListener('input', () => {
            const value = parseFloat(saturationSlider.value);
            saturationValue.textContent = value.toFixed(1);
            uniforms.saturation.value = value;
        });
    }
    
    const sharpnessSlider = document.getElementById('sharpness');
    const sharpnessValue = document.getElementById('sharpness-value');
    if (sharpnessSlider && sharpnessValue) {
        sharpnessSlider.addEventListener('input', () => {
            const value = parseFloat(sharpnessSlider.value);
            sharpnessValue.textContent = value.toFixed(1);
            uniforms.sharpness.value = value;
        });
    }
    
    const crystalScaleSlider = document.getElementById('crystal-scale');
    const crystalScaleValue = document.getElementById('crystal-scale-value');
    if (crystalScaleSlider && crystalScaleValue) {
        crystalScaleSlider.addEventListener('input', () => {
            const value = parseFloat(crystalScaleSlider.value);
            crystalScaleValue.textContent = value.toFixed(1);
            uniforms.crystalScale.value = value;
        });
    }
}

// Apply theme function
function applyTheme(themeName) {
    currentTheme = themeName;
    const theme = themes[themeName];
    
    if (!theme) {
        console.error(`Theme '${themeName}' not found`);
        return;
    }
    
    // Check if fogColor is a Vector3 or convert it if it's not
    if (theme.fogColor && uniforms && uniforms.fogColor) {
        if (theme.fogColor instanceof THREE.Vector3) {
            uniforms.fogColor.value.copy(theme.fogColor);
        } else if (theme.fogColor instanceof THREE.Color) {
            // If it's a THREE.Color, convert to Vector3
            uniforms.fogColor.value.set(theme.fogColor.r, theme.fogColor.g, theme.fogColor.b);
        } else {
            // If it's another format, try to handle it
            console.log("Setting fogColor from different format", theme.fogColor);
            if (Array.isArray(theme.fogColor) && theme.fogColor.length >= 3) {
                uniforms.fogColor.value.set(theme.fogColor[0], theme.fogColor[1], theme.fogColor[2]);
            } else if (typeof theme.fogColor === 'number') {
                const color = new THREE.Color(theme.fogColor);
                uniforms.fogColor.value.set(color.r, color.g, color.b);
            }
        }
    }
    
    // Handle textureScale with similar care
    if (theme.textureScale && uniforms && uniforms.uvScale) {
        if (theme.textureScale instanceof THREE.Vector2) {
            uniforms.uvScale.value.copy(theme.textureScale);
        } else if (Array.isArray(theme.textureScale) && theme.textureScale.length >= 2) {
            uniforms.uvScale.value.set(theme.textureScale[0], theme.textureScale[1]);
        }
    }
    
    // Set scalar values safely
    if (typeof theme.glowMultiplier === 'number') {
        // Set the global glowIntensity variable instead of using uniforms.glowMultiplier
        glowIntensity = theme.glowMultiplier;
        
        // Update bloom pass if it exists
        if (bloomPass) {
            bloomPass.strength = theme.glowMultiplier;
        }
    }
    
    if (typeof theme.backgroundColor === 'number' && scene) {
        scene.background = new THREE.Color(theme.backgroundColor);
    }
    
    // Update slider values to match theme
    const glowElement = document.getElementById('glow-intensity');
    const glowValueElement = document.getElementById('glow-intensity-value');
    
    if (glowElement && typeof theme.glowMultiplier === 'number') {
        glowElement.value = theme.glowMultiplier;
        if (glowValueElement) {
            glowValueElement.textContent = theme.glowMultiplier.toFixed(1);
        }
    }
    
    // Update the theme select dropdown to match the current theme
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
        themeSelect.value = themeName;
    }
    
    // Update the turbulence mode buttons based on the theme
    const standardButton = document.getElementById('standard-mode');
    const crystalButton = document.getElementById('crystal-mode');
    const moonButton = document.getElementById('moon-mode');
    
    if (standardButton && crystalButton && moonButton && uniforms) {
        if (themeName === 'moon') {
            standardButton.classList.remove('active');
            crystalButton.classList.remove('active');
            moonButton.classList.add('active');
            uniforms.turbulenceMode.value = 2;
        } else if (themeName === 'toxic' || themeName === 'crystal') {
            standardButton.classList.remove('active');
            crystalButton.classList.add('active');
            moonButton.classList.remove('active');
            uniforms.turbulenceMode.value = 1;
        } else {
            standardButton.classList.add('active');
            crystalButton.classList.remove('active');
            moonButton.classList.remove('active');
            uniforms.turbulenceMode.value = 0;
        }
    }
}

// Change the geometry of the mesh
function changeGeometry(index) {
    if (index < 0 || index >= geometries.length) return;
    
    currentGeometryIndex = index;
    
    // Store the old rotation
    const oldRotation = {
        x: mesh.rotation.x,
        y: mesh.rotation.y,
        z: mesh.rotation.z
    };
    
    // Remove the old mesh
    scene.remove(mesh);
    
    // Create a new mesh with the selected geometry
    mesh = new THREE.Mesh(geometries[index], mesh.material);
    
    // Apply the old rotation
    mesh.rotation.set(oldRotation.x, oldRotation.y, oldRotation.z);
    
    // Add the new mesh to the scene
    scene.add(mesh);
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Update controls for smooth camera movement - add check for undefined
    if (controls) {
        controls.update();
        updateZoom(); // Add smooth zoom update
    }
    
    const delta = clock.getDelta();
    
    // Update uniforms - improved check to handle null values
    if (uniforms['texture1'].value && uniforms['texture2'].value && 
        uniforms['texture1'].value.image && uniforms['texture2'].value.image) {
        
        // Update time based on flowSpeed
        uniforms['time'].value += delta * uniforms['flowSpeed'].value;
        
        // Update resolution uniform on each frame to handle zoom changes
        if (uniforms['resolution']) {
            uniforms['resolution'].value.set(window.innerWidth, window.innerHeight);
        }
        
        // Update FPS counter
        updateFPSCounter();
        
        // Rotate the mesh if autoRotate is enabled - smoothed rotation
        if (autoRotate && mesh) {
            mesh.rotation.x += delta * 0.25;
            mesh.rotation.y += delta * 0.5;
        }
        
        // Use smoother rendering with explicit render sequence
        if (composer) {
            composer.render();
        } else if (renderer && scene && camera) {
            renderer.render(scene, camera);
        }
    } else {
        // Even if textures aren't loaded, do a basic render to show something
        if (renderer && scene && camera) {
            renderer.render(scene, camera);
        }
    }
}

// FPS counter
let lastFrameTime = performance.now();
let frameCount = 0;

function updateFPSCounter() {
    frameCount++;
    const now = performance.now();
    const elapsed = now - lastFrameTime;
    
    if (elapsed >= 1000) {
        const fps = Math.round((frameCount * 1000) / elapsed);
        document.getElementById('fps-counter').textContent = `FPS: ${fps}`;
        frameCount = 0;
        lastFrameTime = now;
    }
}

// Create a star particle system
function createStars() {
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 1000;
    const starPositions = [];
    const starSizes = [];
    
    // Create random stars in a sphere around the camera
    for (let i = 0; i < starCount; i++) {
        // Create stars in a spherical distribution
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const distance = 10 + Math.random() * 50; // Between 10 and 60 units away
        
        const x = distance * Math.sin(phi) * Math.cos(theta);
        const y = distance * Math.sin(phi) * Math.sin(theta);
        const z = distance * Math.cos(phi);
        
        starPositions.push(x, y, z);
        
        // Random star sizes
        starSizes.push(0.5 + Math.random() * 1.5);
    }
    
    // Create star attributes
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('size', new THREE.Float32BufferAttribute(starSizes, 1));
    
    // Star shader material
    const starMaterial = new THREE.ShaderMaterial({
        uniforms: {
            color: { value: new THREE.Color(0xffffff) },
            starTexture: { value: null } // We'll use a computed shape
        },
        vertexShader: `
            attribute float size;
            varying float vSize;
            
            void main() {
                vSize = size;
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = size * (300.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            uniform vec3 color;
            varying float vSize;
            
            void main() {
                // Create a circular point
                vec2 center = vec2(0.5, 0.5);
                float distance = length(gl_PointCoord - center);
                
                // Soft circle with fade at edges
                float strength = 1.0 - smoothstep(0.3, 0.5, distance);
                
                // Add some variation based on size
                float glow = 0.3 * vSize;
                
                // Combine for final color
                gl_FragColor = vec4(color, strength * glow);
            }
        `,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true
    });
    
    // Create the star particle system
    stars = new THREE.Points(starGeometry, starMaterial);
    stars.visible = false; // Initially hidden
    scene.add(stars);
}

// Calculate FPS
function calculateFPS() {
    if (!lastCalledTime) {
        lastCalledTime = performance.now();
        fps = 0;
        return;
    }
    
    const delta = (performance.now() - lastCalledTime) / 1000;
    lastCalledTime = performance.now();
    fps = Math.round(1 / delta);
    
    document.getElementById('fps-counter').textContent = `FPS: ${fps}`;
}

// Add reset camera function
function resetCamera() {
    // Reset camera position and target
    camera.position.set(0, 0, 4);
    controls.target.set(0, 0, 0);
    controls.update();
    
    // Force a render
    if (composer) {
        composer.render();
    }
}

// Add sacred geometry creation functions
function createMerkaba(size) {
    // Create a merkaba (star tetrahedron) by combining two tetrahedra
    const geometry = new THREE.BufferGeometry();
    
    // Scale factor
    const s = size || 1.0;
    
    // Create vertices for two tetrahedra
    const vertices = [
        // Upward tetrahedron
        0, s * 0.8, 0,
        s * 0.8, -s * 0.4, 0,
        -s * 0.4, -s * 0.4, s * 0.7,
        -s * 0.4, -s * 0.4, -s * 0.7,
        
        // Downward tetrahedron
        0, -s * 0.8, 0,
        -s * 0.8, s * 0.4, 0,
        s * 0.4, s * 0.4, -s * 0.7,
        s * 0.4, s * 0.4, s * 0.7
    ];
    
    // Create faces (triangles)
    const indices = [
        // Upward tetrahedron
        0, 1, 2,
        0, 2, 3,
        0, 3, 1,
        1, 3, 2,
        
        // Downward tetrahedron
        4, 5, 6,
        4, 6, 7,
        4, 7, 5,
        5, 7, 6
    ];
    
    // Set attributes
    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();
    
    return geometry;
}

function createFlowerOfLife(size) {
    // Create Flower of Life pattern using circles
    const geometry = new THREE.BufferGeometry();
    const s = size || 1.0;
    const segments = 36;
    const radius = s * 0.2;
    
    // Center positions for the circles in the Flower of Life
    const centers = [
        [0, 0, 0],
        [radius * Math.sqrt(3), 0, 0],
        [radius * Math.sqrt(3)/2, radius * 1.5, 0],
        [-radius * Math.sqrt(3)/2, radius * 1.5, 0],
        [-radius * Math.sqrt(3), 0, 0],
        [-radius * Math.sqrt(3)/2, -radius * 1.5, 0],
        [radius * Math.sqrt(3)/2, -radius * 1.5, 0],
        [radius * Math.sqrt(3) * 2, 0, 0],
        [radius * Math.sqrt(3), radius * 3, 0],
        [0, radius * 3, 0],
        [-radius * Math.sqrt(3), radius * 3, 0],
        [-radius * Math.sqrt(3) * 2, 0, 0],
        [-radius * Math.sqrt(3), -radius * 3, 0],
        [0, -radius * 3, 0],
        [radius * Math.sqrt(3), -radius * 3, 0],
        [radius * Math.sqrt(3) * 1.5, radius * 1.5, 0],
        [0, radius * 6, 0],
        [-radius * Math.sqrt(3) * 1.5, radius * 1.5, 0],
        [-radius * Math.sqrt(3) * 1.5, -radius * 1.5, 0],
        [0, -radius * 6, 0],
        [radius * Math.sqrt(3) * 1.5, -radius * 1.5, 0]
    ];
    
    // Create a tube/torus for each circle in the pattern
    const tempGeometry = new THREE.TorusGeometry(radius, radius * 0.02, 8, segments);
    let positions = [];
    let indices = [];
    let vertexOffset = 0;
    
    centers.forEach(center => {
        // Clone the torus geometry and position it
        const tempPositions = tempGeometry.attributes.position.array.slice();
        const tempIndices = tempGeometry.index.array.slice();
        
        // Translate the circle to its center position
        for (let i = 0; i < tempPositions.length; i += 3) {
            tempPositions[i] += center[0];
            tempPositions[i+1] += center[1];
            tempPositions[i+2] += center[2];
        }
        
        // Add positions to the main geometry
        positions = positions.concat(Array.from(tempPositions));
        
        // Adjust indices for vertex offset
        for (let i = 0; i < tempIndices.length; i++) {
            indices.push(tempIndices[i] + vertexOffset);
        }
        
        vertexOffset += tempPositions.length / 3;
    });
    
    // Set geometry attributes
    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.computeVertexNormals();
    
    return geometry;
}

function createMetatronsCube(size) {
    // Create Metatron's Cube
    const geometry = new THREE.BufferGeometry();
    const s = size || 1.0;
    
    // Define the 13 points of Metatron's Cube (normalized)
    const points = [
        [0, 0, 0], // Center (0)
        [1, 0, 0], [-0.5, 0.866, 0], [-0.5, -0.866, 0], // Outer triangle 1 (1,2,3)
        [0, 0, 1], [0, 0, -1], // Top and bottom points (4,5)
        [0.5, 0.866, 0], [-1, 0, 0], [0.5, -0.866, 0], // Outer triangle 2 (6,7,8)
        [0.5, 0.289, 0.816], [-0.5, 0.289, 0.816], // Upper points (9,10)
        [0.5, -0.289, -0.816], [-0.5, -0.289, -0.816] // Lower points (11,12)
    ];
    
    // Scale points
    const scaledPoints = points.map(p => [p[0] * s, p[1] * s, p[2] * s]);
    
    // Define line segments connecting the points - ensure indices are valid
    const lines = [
        // Central hexagon
        [1, 6], [6, 7], [7, 3], [3, 8], [8, 1], [2, 6], 
        // More connections, simplified to avoid invalid indices
        [2, 7], [3, 8], [1, 2], [2, 3], [3, 1]
    ];
    
    // Create tube geometry for each line
    const tubeRadius = s * 0.02;
    const tubeSegments = 8;
    const tubeRadialSegments = 6;
    
    let positions = [];
    let indices = [];
    let vertexOffset = 0;
    
    // Create tubes for lines - add validation to avoid errors
    lines.forEach(line => {
        // Validate indices
        if (line[0] >= 0 && line[0] < scaledPoints.length && 
            line[1] >= 0 && line[1] < scaledPoints.length) {
            
            const start = new THREE.Vector3(
                scaledPoints[line[0]][0], 
                scaledPoints[line[0]][1], 
                scaledPoints[line[0]][2]
            );
            
            const end = new THREE.Vector3(
                scaledPoints[line[1]][0], 
                scaledPoints[line[1]][1], 
                scaledPoints[line[1]][2]
            );
            
            // Create a path
            const path = new THREE.LineCurve3(start, end);
            const tempGeometry = new THREE.TubeGeometry(path, tubeSegments, tubeRadius, tubeRadialSegments, false);
            
            // Add positions and indices
            const tempPositions = tempGeometry.attributes.position.array;
            const tempIndices = tempGeometry.index.array;
            
            positions = positions.concat(Array.from(tempPositions));
            
            for (let i = 0; i < tempIndices.length; i++) {
                indices.push(tempIndices[i] + vertexOffset);
            }
            
            vertexOffset += tempPositions.length / 3;
        }
    });
    
    // Add small spheres at each point for better visualization
    const sphereRadius = s * 0.05;
    const sphereSegments = 8;
    
    scaledPoints.forEach(point => {
        const tempGeometry = new THREE.SphereGeometry(sphereRadius, sphereSegments, sphereSegments);
        const tempPositions = tempGeometry.attributes.position.array.slice();
        const tempIndices = tempGeometry.index.array.slice();
        
        // Translate the sphere to point position
        for (let i = 0; i < tempPositions.length; i += 3) {
            tempPositions[i] += point[0];
            tempPositions[i+1] += point[1];
            tempPositions[i+2] += point[2];
        }
        
        // Add positions to the main geometry
        positions = positions.concat(Array.from(tempPositions));
        
        // Adjust indices for vertex offset
        for (let i = 0; i < tempIndices.length; i++) {
            indices.push(tempIndices[i] + vertexOffset);
        }
        
        vertexOffset += tempPositions.length / 3;
    });
    
    // Set geometry attributes
    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.computeVertexNormals();
    
    return geometry;
}

function createSriYantra(size) {
    // Create a simplified Sri Yantra
    const geometry = new THREE.BufferGeometry();
    const s = size || 1.0;
    
    // Create triangles for the yantra
    const createTriangle = (innerRadius, outerRadius, yOffset, rotation) => {
        const trianglePoints = [];
        
        // Calculate triangle points
        const top = [0, outerRadius + yOffset, 0];
        const bottomLeft = [-innerRadius, -innerRadius * 0.5 + yOffset, 0];
        const bottomRight = [innerRadius, -innerRadius * 0.5 + yOffset, 0];
        
        // Apply rotation
        const rotatePoint = (point) => {
            const x = point[0] * Math.cos(rotation) - point[1] * Math.sin(rotation);
            const y = point[0] * Math.sin(rotation) + point[1] * Math.cos(rotation);
            return [x, y, point[2]];
        };
        
        const rotatedTop = rotatePoint(top);
        const rotatedBottomLeft = rotatePoint(bottomLeft);
        const rotatedBottomRight = rotatePoint(bottomRight);
        
        // Add to points array
        trianglePoints.push(...rotatedTop, ...rotatedBottomLeft, ...rotatedBottomRight);
        
        return trianglePoints;
    };
    
    let positions = [];
    let indices = [];
    let vertexOffset = 0;
    
    // Create the nested triangles of Sri Yantra
    const triangleLayers = 9;
    
    for (let i = 0; i < triangleLayers; i++) {
        const radius = s * (1 - i * 0.1);
        const yOffset = i % 2 === 0 ? 0 : 0;
        const rotation = i % 2 === 0 ? 0 : Math.PI;
        
        // Create triangle and add to positions
        const trianglePoints = createTriangle(radius, radius, yOffset, rotation);
        
        // Create mesh for the triangle
        const lineWidth = s * 0.02;
        const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        
        // Create tube for each edge of the triangle
        const tubeRadius = s * 0.01;
        const tubeSegments = 8;
        const tubeRadialSegments = 6;
        
        // Create tubes for triangle edges
        const edges = [
            [0, 1], [1, 2], [2, 0]
        ];
        
        for (let j = 0; j < edges.length; j++) {
            const startIndex = edges[j][0] * 3;
            const endIndex = edges[j][1] * 3;
            
            const start = new THREE.Vector3(
                trianglePoints[startIndex], 
                trianglePoints[startIndex + 1], 
                trianglePoints[startIndex + 2]
            );
            
            const end = new THREE.Vector3(
                trianglePoints[endIndex], 
                trianglePoints[endIndex + 1], 
                trianglePoints[endIndex + 2]
            );
            
            // Create a path
            const path = new THREE.LineCurve3(start, end);
            const tempGeometry = new THREE.TubeGeometry(path, tubeSegments, tubeRadius, tubeRadialSegments, false);
            
            // Add positions and indices
            const tempPositions = tempGeometry.attributes.position.array;
            const tempIndices = tempGeometry.index.array;
            
            positions = positions.concat(Array.from(tempPositions));
            
            for (let k = 0; k < tempIndices.length; k++) {
                indices.push(tempIndices[k] + vertexOffset);
            }
            
            vertexOffset += tempPositions.length / 3;
        }
    }
    
    // Create center point and circles
    const centerRadius = s * 0.05;
    const centerSegments = 16;
    const centerGeometry = new THREE.SphereGeometry(centerRadius, centerSegments, centerSegments);
    
    const centerPositions = centerGeometry.attributes.position.array.slice();
    const centerIndices = centerGeometry.index.array.slice();
    
    positions = positions.concat(Array.from(centerPositions));
    
    for (let i = 0; i < centerIndices.length; i++) {
        indices.push(centerIndices[i] + vertexOffset);
    }
    
    vertexOffset += centerPositions.length / 3;
    
    // Set geometry attributes
    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.computeVertexNormals();
    
    return geometry;
}

function createPlatonic(size, type) {
    // Create Platonic solids
    let geometry;
    const s = size || 1.0;
    
    switch (type) {
        case 'tetrahedron':
            geometry = new THREE.TetrahedronGeometry(s, 0);
            break;
        case 'octahedron':
            geometry = new THREE.OctahedronGeometry(s, 0);
            break;
        case 'dodecahedron':
            geometry = new THREE.DodecahedronGeometry(s, 0);
            break;
        case 'icosahedron':
            geometry = new THREE.IcosahedronGeometry(s, 0);
            break;
        default: // Default to cube
            geometry = new THREE.BoxGeometry(s, s, s);
    }
    
    return geometry;
}

// Add cell creation function
function createCell(size) {
    // Create a biological cell with nucleus, organelles, and membrane
    const geometry = new THREE.BufferGeometry();
    const s = size || 1.0;
    
    let positions = [];
    let indices = [];
    let vertexOffset = 0;
    
    // Create cell membrane (outer sphere)
    const membraneRadius = s * 0.95;
    const membraneGeometry = new THREE.SphereGeometry(membraneRadius, 32, 32);
    const membranePositions = membraneGeometry.attributes.position.array.slice();
    const membraneIndices = membraneGeometry.index.array.slice();
    
    // Make the membrane slightly transparent by scaling some vertices
    for (let i = 0; i < membranePositions.length; i += 3) {
        // Random slight displacement for membrane
        const displacement = 1.0 + (Math.random() * 0.05 - 0.025);
        membranePositions[i] *= displacement;
        membranePositions[i+1] *= displacement;
        membranePositions[i+2] *= displacement;
    }
    
    // Add membrane to the geometry
    positions = positions.concat(Array.from(membranePositions));
    for (let i = 0; i < membraneIndices.length; i++) {
        indices.push(membraneIndices[i] + vertexOffset);
    }
    vertexOffset += membranePositions.length / 3;
    
    // Create nucleus (central sphere)
    const nucleusRadius = s * 0.35;
    const nucleusGeometry = new THREE.SphereGeometry(nucleusRadius, 24, 24);
    const nucleusPositions = nucleusGeometry.attributes.position.array.slice();
    const nucleusIndices = nucleusGeometry.index.array.slice();
    
    // Add nucleus to the geometry
    positions = positions.concat(Array.from(nucleusPositions));
    for (let i = 0; i < nucleusIndices.length; i++) {
        indices.push(nucleusIndices[i] + vertexOffset);
    }
    vertexOffset += nucleusPositions.length / 3;
    
    // Create mitochondria (several elongated shapes)
    const mitochondriaCount = 6;
    for (let i = 0; i < mitochondriaCount; i++) {
        // Position mitochondria around nucleus but inside membrane
        const distance = s * (0.45 + Math.random() * 0.25);
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        
        const x = distance * Math.sin(phi) * Math.cos(theta);
        const y = distance * Math.sin(phi) * Math.sin(theta);
        const z = distance * Math.cos(phi);
        
        // Create elongated shape for mitochondrion
        const length = s * (0.15 + Math.random() * 0.1);
        const radius = s * 0.05;
        const mitoGeometry = new THREE.CapsuleGeometry(radius, length, 8, 8);
        
        // Random rotation for mitochondrion
        const rotationMatrix = new THREE.Matrix4();
        rotationMatrix.makeRotationFromEuler(new THREE.Euler(
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2
        ));
        
        const mitoPositions = mitoGeometry.attributes.position.array.slice();
        const mitoIndices = mitoGeometry.index.array.slice();
        
        // Apply rotation and translation
        for (let j = 0; j < mitoPositions.length; j += 3) {
            const vertex = new THREE.Vector3(
                mitoPositions[j],
                mitoPositions[j+1],
                mitoPositions[j+2]
            );
            
            vertex.applyMatrix4(rotationMatrix);
            
            mitoPositions[j] = vertex.x + x;
            mitoPositions[j+1] = vertex.y + y;
            mitoPositions[j+2] = vertex.z + z;
        }
        
        // Add mitochondrion to the geometry
        positions = positions.concat(Array.from(mitoPositions));
        for (let j = 0; j < mitoIndices.length; j++) {
            indices.push(mitoIndices[j] + vertexOffset);
        }
        vertexOffset += mitoPositions.length / 3;
    }
    
    // Create endoplasmic reticulum (curved tubes)
    const erSegments = 4;
    for (let i = 0; i < erSegments; i++) {
        // Create a curved path for the ER
        const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(
                (Math.random() * 2 - 1) * s * 0.3 + s * 0.2,
                (Math.random() * 2 - 1) * s * 0.3,
                (Math.random() * 2 - 1) * s * 0.3
            ),
            new THREE.Vector3(
                (Math.random() * 2 - 1) * s * 0.3 + s * 0.1,
                (Math.random() * 2 - 1) * s * 0.3,
                (Math.random() * 2 - 1) * s * 0.3
            ),
            new THREE.Vector3(
                (Math.random() * 2 - 1) * s * 0.3,
                (Math.random() * 2 - 1) * s * 0.3,
                (Math.random() * 2 - 1) * s * 0.3
            )
        ]);
        
        const erGeometry = new THREE.TubeGeometry(curve, 12, s * 0.03, 8, false);
        const erPositions = erGeometry.attributes.position.array.slice();
        const erIndices = erGeometry.index.array.slice();
        
        // Add ER to the geometry
        positions = positions.concat(Array.from(erPositions));
        for (let j = 0; j < erIndices.length; j++) {
            indices.push(erIndices[j] + vertexOffset);
        }
        vertexOffset += erPositions.length / 3;
    }
    
    // Create ribosomes (small spheres attached to ER and free-floating)
    const ribosomeCount = 16;
    for (let i = 0; i < ribosomeCount; i++) {
        // Position ribosomes throughout cytoplasm
        const distance = s * (0.3 + Math.random() * 0.5);
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        
        const x = distance * Math.sin(phi) * Math.cos(theta);
        const y = distance * Math.sin(phi) * Math.sin(theta);
        const z = distance * Math.cos(phi);
        
        // Small sphere for ribosome
        const ribosomeRadius = s * (0.015 + Math.random() * 0.01);
        const riboGeometry = new THREE.SphereGeometry(ribosomeRadius, 8, 8);
        const riboPositions = riboGeometry.attributes.position.array.slice();
        const riboIndices = riboGeometry.index.array.slice();
        
        // Translate ribosome
        for (let j = 0; j < riboPositions.length; j += 3) {
            riboPositions[j] += x;
            riboPositions[j+1] += y;
            riboPositions[j+2] += z;
        }
        
        // Add ribosome to the geometry
        positions = positions.concat(Array.from(riboPositions));
        for (let j = 0; j < riboIndices.length; j++) {
            indices.push(riboIndices[j] + vertexOffset);
        }
        vertexOffset += riboPositions.length / 3;
    }
    
    // Create Golgi apparatus (stacked curved planes)
    const golgiPosition = new THREE.Vector3(
        s * 0.4,
        s * 0.1,
        s * -0.2
    );
    
    const golgiStack = 5;
    for (let i = 0; i < golgiStack; i++) {
        // Create a curved disc for each layer of the Golgi
        const golgiRadius = s * (0.12 - i * 0.01);
        const golgiGeometry = new THREE.CircleGeometry(golgiRadius, 16);
        
        // Curve the disc slightly
        const golgiPositions = golgiGeometry.attributes.position.array.slice();
        const golgiIndices = golgiGeometry.index ? golgiGeometry.index.array.slice() : [];
        
        // Generate indices if not present
        if (golgiIndices.length === 0) {
            for (let j = 0; j < golgiPositions.length / 3; j++) {
                golgiIndices.push(j);
            }
        }
        
        for (let j = 0; j < golgiPositions.length; j += 3) {
            // Apply slight curve
            const distFromCenter = Math.sqrt(
                golgiPositions[j] * golgiPositions[j] + 
                golgiPositions[j+1] * golgiPositions[j+1]
            );
            golgiPositions[j+2] = (distFromCenter * distFromCenter) * s * 0.2;
            
            // Apply position offset and stacking
            golgiPositions[j] += golgiPosition.x;
            golgiPositions[j+1] += golgiPosition.y;
            golgiPositions[j+2] += golgiPosition.z + i * s * 0.02;
        }
        
        // Add Golgi layer to the geometry
        positions = positions.concat(Array.from(golgiPositions));
        for (let j = 0; j < golgiIndices.length; j++) {
            indices.push(golgiIndices[j] + vertexOffset);
        }
        vertexOffset += golgiPositions.length / 3;
    }
    
    // Set geometry attributes
    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.computeVertexNormals();
    
    return geometry;
}

// Add human eye creation function
function createEye(size) {
    // Create a realistic human eye with cornea, iris, pupil, and sclera
    const geometry = new THREE.BufferGeometry();
    const s = size || 1.0;
    
    let positions = [];
    let indices = [];
    let vertexOffset = 0;
    
    // Create eyeball (sclera) - white part of the eye
    const eyeballRadius = s * 0.95;
    const eyeballGeometry = new THREE.SphereGeometry(eyeballRadius, 48, 48);
    const eyeballPositions = eyeballGeometry.attributes.position.array.slice();
    const eyeballIndices = eyeballGeometry.index.array.slice();
    
    // Add eyeball to the geometry
    positions = positions.concat(Array.from(eyeballPositions));
    for (let i = 0; i < eyeballIndices.length; i++) {
        indices.push(eyeballIndices[i] + vertexOffset);
    }
    vertexOffset += eyeballPositions.length / 3;
    
    // Create iris (colored part) with cornea bulge
    const irisRadius = s * 0.35;
    const irisGeometry = new THREE.CircleGeometry(irisRadius, 48);
    const irisPositions = irisGeometry.attributes.position.array.slice();
    const irisIndices = irisGeometry.index ? irisGeometry.index.array.slice() : [];
    
    // Generate indices if not present (for some geometries)
    if (irisIndices.length === 0) {
        for (let i = 0; i < irisPositions.length / 3; i++) {
            irisIndices.push(i);
        }
    }
    
    // Position iris at the front of the eye with slight bulge (cornea)
    const corneaBulge = s * 0.06;
    for (let i = 0; i < irisPositions.length; i += 3) {
        // Calculate distance from center for cornea bulge
        const x = irisPositions[i];
        const y = irisPositions[i+1];
        const distFromCenter = Math.sqrt(x*x + y*y);
        const bulge = corneaBulge * (1 - distFromCenter / irisRadius);
        
        // Position iris at front of eyeball
        irisPositions[i] = x;
        irisPositions[i+1] = y;
        irisPositions[i+2] = eyeballRadius + bulge; 
    }
    
    // Add iris to the geometry
    positions = positions.concat(Array.from(irisPositions));
    for (let i = 0; i < irisIndices.length; i++) {
        indices.push(irisIndices[i] + vertexOffset);
    }
    vertexOffset += irisPositions.length / 3;
    
    // Create pupil (black center of iris)
    const pupilRadius = s * 0.15;
    const pupilGeometry = new THREE.CircleGeometry(pupilRadius, 32);
    const pupilPositions = pupilGeometry.attributes.position.array.slice();
    const pupilIndices = pupilGeometry.index ? pupilGeometry.index.array.slice() : [];
    
    // Generate indices if not present
    if (pupilIndices.length === 0) {
        for (let i = 0; i < pupilPositions.length / 3; i++) {
            pupilIndices.push(i);
        }
    }
    
    // Position pupil slightly in front of iris
    for (let i = 0; i < pupilPositions.length; i += 3) {
        pupilPositions[i+2] = eyeballRadius + corneaBulge * 1.1;
    }
    
    // Add pupil to geometry
    positions = positions.concat(Array.from(pupilPositions));
    for (let i = 0; i < pupilIndices.length; i++) {
        indices.push(pupilIndices[i] + vertexOffset);
    }
    vertexOffset += pupilPositions.length / 3;
    
    // Create cornea (transparent front part of eye)
    const corneaRadius = s * 0.5;
    const corneaSegments = 24;
    const corneaGeometry = new THREE.SphereGeometry(
        corneaRadius, 
        corneaSegments, 
        corneaSegments,
        0, // phiStart
        Math.PI, // phiLength - half a sphere
        0, // thetaStart
        Math.PI / 2 // thetaLength - quarter of a circle
    );
    
    const corneaPositions = corneaGeometry.attributes.position.array.slice();
    const corneaIndices = corneaGeometry.index.array.slice();
    
    // Position and scale cornea to fit at front of eye
    for (let i = 0; i < corneaPositions.length; i += 3) {
        corneaPositions[i] *= 0.7; // Scale X
        corneaPositions[i+1] *= 0.7; // Scale Y
        corneaPositions[i+2] = corneaPositions[i+2] + eyeballRadius * 0.7;
    }
    
    // Add cornea to the geometry
    positions = positions.concat(Array.from(corneaPositions));
    for (let i = 0; i < corneaIndices.length; i++) {
        indices.push(corneaIndices[i] + vertexOffset);
    }
    vertexOffset += corneaPositions.length / 3;
    
    // Create blood vessels (thin red lines on sclera)
    const vesselCount = 15;
    for (let i = 0; i < vesselCount; i++) {
        // Create random starting point on sclera
        const theta = Math.random() * Math.PI * 0.8 - Math.PI * 0.4; // -40 to +40 degrees
        const phi = Math.random() * Math.PI * 0.8 - Math.PI * 0.4; // -40 to +40 degrees
        
        const startX = eyeballRadius * Math.sin(phi) * Math.cos(theta);
        const startY = eyeballRadius * Math.sin(phi) * Math.sin(theta);
        const startZ = eyeballRadius * Math.cos(phi);
        
        // Create endpoint (toward iris)
        const endTheta = Math.atan2(startY, startX);
        const endRadius = eyeballRadius * 0.6;
        const endX = endRadius * Math.cos(endTheta);
        const endY = endRadius * Math.sin(endTheta);
        const endZ = eyeballRadius * 0.8;
        
        // Create path for vessel
        const start = new THREE.Vector3(startX, startY, startZ);
        const end = new THREE.Vector3(endX, endY, endZ);
        const path = new THREE.LineCurve3(start, end);
        
        // Create thin tube for vessel
        const vesselRadius = s * 0.003;
        const vesselSegments = 6;
        const vesselGeometry = new THREE.TubeGeometry(
            path, 8, vesselRadius, vesselSegments, false
        );
        
        const vesselPositions = vesselGeometry.attributes.position.array.slice();
        const vesselIndices = vesselGeometry.index.array.slice();
        
        // Add vessel to geometry
        positions = positions.concat(Array.from(vesselPositions));
        for (let j = 0; j < vesselIndices.length; j++) {
            indices.push(vesselIndices[j] + vertexOffset);
        }
        vertexOffset += vesselPositions.length / 3;
    }
    
    // Create eyelids (curved surfaces)
    // Upper eyelid
    const upperLidCurve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(-s * 0.6, s * 0.1, s * 0.5),  // Start
        new THREE.Vector3(0, s * 0.5, s * 0.7),         // Control
        new THREE.Vector3(s * 0.6, s * 0.1, s * 0.5)    // End
    );
    
    const upperLidGeometry = new THREE.TubeGeometry(
        upperLidCurve, 24, s * 0.1, 12, false
    );
    
    const upperLidPositions = upperLidGeometry.attributes.position.array.slice();
    const upperLidIndices = upperLidGeometry.index.array.slice();
    
    // Add upper eyelid to geometry
    positions = positions.concat(Array.from(upperLidPositions));
    for (let i = 0; i < upperLidIndices.length; i++) {
        indices.push(upperLidIndices[i] + vertexOffset);
    }
    vertexOffset += upperLidPositions.length / 3;
    
    // Lower eyelid
    const lowerLidCurve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(-s * 0.6, -s * 0.1, s * 0.5),  // Start
        new THREE.Vector3(0, -s * 0.3, s * 0.6),         // Control
        new THREE.Vector3(s * 0.6, -s * 0.1, s * 0.5)    // End
    );
    
    const lowerLidGeometry = new THREE.TubeGeometry(
        lowerLidCurve, 24, s * 0.08, 12, false
    );
    
    const lowerLidPositions = lowerLidGeometry.attributes.position.array.slice();
    const lowerLidIndices = lowerLidGeometry.index.array.slice();
    
    // Add lower eyelid to geometry
    positions = positions.concat(Array.from(lowerLidPositions));
    for (let i = 0; i < lowerLidIndices.length; i++) {
        indices.push(lowerLidIndices[i] + vertexOffset);
    }
    vertexOffset += lowerLidPositions.length / 3;
    
    // Create eyelashes (small cylinders)
    const lashCount = 20;
    const lashLength = s * 0.15;
    const lashRadius = s * 0.005;
    
    for (let i = 0; i < lashCount; i++) {
        // Position along upper eyelid
        const t = i / (lashCount - 1);
        const lidPoint = upperLidCurve.getPoint(t);
        
        // Angle for eyelash (outward and upward)
        const angle = Math.PI / 3 + (Math.random() * Math.PI / 8);
        const dirX = Math.sin(angle) * Math.cos(t * Math.PI - Math.PI/2);
        const dirY = Math.sin(angle) * Math.sin(t * Math.PI - Math.PI/2) + 0.5;
        const dirZ = -Math.cos(angle) * 0.5;
        
        // Create eyelash
        const lashStart = new THREE.Vector3(lidPoint.x, lidPoint.y, lidPoint.z);
        const lashEnd = new THREE.Vector3(
            lidPoint.x + dirX * lashLength,
            lidPoint.y + dirY * lashLength,
            lidPoint.z + dirZ * lashLength
        );
        
        const lashPath = new THREE.LineCurve3(lashStart, lashEnd);
        const lashGeometry = new THREE.TubeGeometry(
            lashPath, 4, lashRadius, 6, false
        );
        
        const lashPositions = lashGeometry.attributes.position.array.slice();
        const lashIndices = lashGeometry.index.array.slice();
        
        // Add eyelash to geometry
        positions = positions.concat(Array.from(lashPositions));
        for (let j = 0; j < lashIndices.length; j++) {
            indices.push(lashIndices[j] + vertexOffset);
        }
        vertexOffset += lashPositions.length / 3;
    }
    
    // Set geometry attributes
    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.computeVertexNormals();
    
    return geometry;
}

// Add Flower of Life Sphere creation function
function createFlowerOfLifeSphere(size) {
    // Create a Flower of Life pattern mapped onto a sphere
    const geometry = new THREE.BufferGeometry();
    const s = size || 1.0;
    
    let positions = [];
    let indices = [];
    let vertexOffset = 0;
    
    // Create base sphere
    const sphereRadius = s * 0.9;
    const sphereSegments = 48;
    const sphereGeometry = new THREE.SphereGeometry(sphereRadius, sphereSegments, sphereSegments);
    const spherePositions = sphereGeometry.attributes.position.array.slice();
    const sphereIndices = sphereGeometry.index.array.slice();
    
    // Add base sphere to geometry
    positions = positions.concat(Array.from(spherePositions));
    for (let i = 0; i < sphereIndices.length; i++) {
        indices.push(sphereIndices[i] + vertexOffset);
    }
    vertexOffset += spherePositions.length / 3;
    
    // Create circles for Flower of Life pattern
    // The centers of the circles in the Flower of Life pattern
    const circleRadius = s * 0.2;
    const circleSegments = 24;
    const tubeRadius = s * 0.01;
    
    // Function to map 2D coordinates to a point on the sphere
    const mapToSphere = (x, y, radius) => {
        // Map x,y to spherical coordinates
        const u = Math.atan2(y, x);
        const v = Math.sqrt(x*x + y*y) / (radius * 1.5);
        
        if (v > 1) {
            return null; // Outside the mapping range
        }
        
        // Convert to 3D point on sphere using spherical coordinates
        const theta = u;
        const phi = v * Math.PI / 2;
        
        // Get point on sphere
        return new THREE.Vector3(
            radius * Math.sin(phi) * Math.cos(theta),
            radius * Math.sin(phi) * Math.sin(theta),
            radius * Math.cos(phi)
        );
    };
    
    // Define the Flower of Life pattern centers
    const centers = [
        [0, 0], // Center circle
        // First ring - 6 circles around center
        [circleRadius * Math.cos(0), circleRadius * Math.sin(0)],
        [circleRadius * Math.cos(Math.PI/3), circleRadius * Math.sin(Math.PI/3)],
        [circleRadius * Math.cos(2*Math.PI/3), circleRadius * Math.sin(2*Math.PI/3)],
        [circleRadius * Math.cos(Math.PI), circleRadius * Math.sin(Math.PI)],
        [circleRadius * Math.cos(4*Math.PI/3), circleRadius * Math.sin(4*Math.PI/3)],
        [circleRadius * Math.cos(5*Math.PI/3), circleRadius * Math.sin(5*Math.PI/3)],
        // Second ring (partial) - additional circles
        [circleRadius * 2 * Math.cos(Math.PI/6), circleRadius * 2 * Math.sin(Math.PI/6)],
        [circleRadius * 2 * Math.cos(Math.PI/2), circleRadius * 2 * Math.sin(Math.PI/2)],
        [circleRadius * 2 * Math.cos(5*Math.PI/6), circleRadius * 2 * Math.sin(5*Math.PI/6)],
        [circleRadius * 2 * Math.cos(7*Math.PI/6), circleRadius * 2 * Math.sin(7*Math.PI/6)],
        [circleRadius * 2 * Math.cos(3*Math.PI/2), circleRadius * 2 * Math.sin(3*Math.PI/2)],
        [circleRadius * 2 * Math.cos(11*Math.PI/6), circleRadius * 2 * Math.sin(11*Math.PI/6)]
    ];
    
    // Create each circle on the sphere surface
    centers.forEach(center => {
        // Map the center to the sphere
        const centerPoint = mapToSphere(center[0], center[1], sphereRadius);
        
        if (centerPoint) {
            // Create a circle path on the sphere
            const circlePoints = [];
            for (let i = 0; i <= circleSegments; i++) {
                const angle = (i / circleSegments) * Math.PI * 2;
                
                // Get point in 2D
                const x = center[0] + circleRadius * 0.5 * Math.cos(angle);
                const y = center[1] + circleRadius * 0.5 * Math.sin(angle);
                
                // Map to sphere
                const point = mapToSphere(x, y, sphereRadius);
                if (point) {
                    circlePoints.push(point);
                }
            }
            
            // Create tube geometry along the circle
            if (circlePoints.length > 2) {
                // Close the loop by connecting back to the start
                circlePoints.push(circlePoints[0]);
                
                // Create a smooth curve through the points
                const curve = new THREE.CatmullRomCurve3(circlePoints);
                const tubeGeometry = new THREE.TubeGeometry(curve, circleSegments, tubeRadius, 8, true);
                
                const tubePositions = tubeGeometry.attributes.position.array.slice();
                const tubeIndices = tubeGeometry.index.array.slice();
                
                // Add tube to the geometry
                positions = positions.concat(Array.from(tubePositions));
                for (let i = 0; i < tubeIndices.length; i++) {
                    indices.push(tubeIndices[i] + vertexOffset);
                }
                vertexOffset += tubePositions.length / 3;
            }
        }
    });
    
    // Add flower of life patterns at different orientations for complete sphere coverage
    const orientations = [
        new THREE.Euler(0, 0, 0),
        new THREE.Euler(Math.PI/2, 0, 0),
        new THREE.Euler(0, Math.PI/2, 0),
        new THREE.Euler(Math.PI, Math.PI/2, 0),
        new THREE.Euler(0, Math.PI, 0),
        new THREE.Euler(Math.PI/2, Math.PI, 0)
    ];
    
    orientations.forEach(orientation => {
        const rotationMatrix = new THREE.Matrix4();
        rotationMatrix.makeRotationFromEuler(orientation);
        
        centers.forEach(center => {
            // Get the 2D circle center
            const x = center[0];
            const y = center[1];
            
            // Skip the center for additional orientations to prevent overlap
            if (orientation.x !== 0 || orientation.y !== 0 || orientation.z !== 0) {
                if (x === 0 && y === 0) return;
            }
            
            // Map the center to the sphere
            const centerPoint = mapToSphere(x, y, sphereRadius);
            
            if (centerPoint) {
                // Apply rotation
                centerPoint.applyMatrix4(rotationMatrix);
                
                // Create a circle path on the sphere
                const circlePoints = [];
                for (let i = 0; i <= circleSegments; i++) {
                    const angle = (i / circleSegments) * Math.PI * 2;
                    
                    // Get point in 2D
                    const circleX = x + circleRadius * 0.5 * Math.cos(angle);
                    const circleY = y + circleRadius * 0.5 * Math.sin(angle);
                    
                    // Map to sphere
                    const point = mapToSphere(circleX, circleY, sphereRadius);
                    if (point) {
                        // Apply rotation
                        point.applyMatrix4(rotationMatrix);
                        circlePoints.push(point);
                    }
                }
                
                // Create tube geometry along the circle
                if (circlePoints.length > 2) {
                    // Close the loop by connecting back to the start
                    circlePoints.push(circlePoints[0]);
                    
                    // Create a smooth curve through the points
                    const curve = new THREE.CatmullRomCurve3(circlePoints);
                    const tubeGeometry = new THREE.TubeGeometry(curve, circleSegments, tubeRadius, 8, true);
                    
                    const tubePositions = tubeGeometry.attributes.position.array.slice();
                    const tubeIndices = tubeGeometry.index.array.slice();
                    
                    // Add tube to the geometry
                    positions = positions.concat(Array.from(tubePositions));
                    for (let i = 0; i < tubeIndices.length; i++) {
                        indices.push(tubeIndices[i] + vertexOffset);
                    }
                    vertexOffset += tubePositions.length / 3;
                }
            }
        });
    });
    
    // Set geometry attributes
    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.computeVertexNormals();
    
    return geometry;
}

// Keyboard controls
function onKeyDown(event) {
    switch(event.key) {
        case '1': 
            document.getElementById('standard-mode').click();
            break;
        case '2': 
            document.getElementById('crystal-mode').click();
            break;
        case '3': 
            document.getElementById('moon-mode').click();
            break;
        case 't':
        case 'T':
            // Cycle through themes
            const themeSelect = document.getElementById('theme-select');
            const currentIndex = themeSelect.selectedIndex;
            const nextIndex = (currentIndex + 1) % themeSelect.options.length;
            themeSelect.selectedIndex = nextIndex;
            themeSelect.dispatchEvent(new Event('change'));
            break;
        case '4': applyTheme('lava'); break;
        case '5': applyTheme('toxic'); break;
        case '6': applyTheme('ocean'); break;
        case '7': applyTheme('moon'); break;
        case '8': applyTheme('inferno'); break;
        case '9': applyTheme('electric'); break;
        case '0': applyTheme('emerald'); break;
        case 'r':
        case 'R':
            resetCamera();
            break;
        // H key is now handled in setupPanelToggles function
    }
} 

// Function to smoothly update camera zoom
function updateZoom() {
    if (!controls || !camera) return;
    
    const zoomDiff = targetZoom - camera.position.z;
    
    // Only update if there's a noticeable difference
    if (Math.abs(zoomDiff) > 0.01 || Math.abs(currentZoomVelocity) > 0.001) {
        // Apply spring physics for smooth zooming
        currentZoomVelocity += zoomDiff * ZOOM_RESPONSIVENESS;
        currentZoomVelocity *= ZOOM_FRICTION;
        
        // Update camera position
        camera.position.z += currentZoomVelocity;
        
        // Ensure we stay within bounds
        camera.position.z = Math.max(controls.minDistance, Math.min(controls.maxDistance, camera.position.z));
    }
}

// Add this function at the end of the file
function setupPanelToggles() {
    // Get panel elements
    const controlsPanel = document.getElementById('controls-panel');
    const infoPanel = document.getElementById('controls-info');
    const toggleControlsBtn = document.getElementById('toggle-controls-panel');
    const toggleInfoBtn = document.getElementById('toggle-info-panel');
    
    if (!controlsPanel || !infoPanel || !toggleControlsBtn || !toggleInfoBtn) {
        console.error('Could not find all required panel elements');
        return;
    }
    
    // Set up controls panel toggle
    toggleControlsBtn.addEventListener('click', () => {
        controlsPanelVisible = !controlsPanelVisible;
        controlsPanel.classList.toggle('hidden', !controlsPanelVisible);
        toggleControlsBtn.textContent = controlsPanelVisible ? 'Hide Controls' : 'Show Controls';
        toggleControlsBtn.classList.toggle('panel-hidden', !controlsPanelVisible);
    });
    
    // Set up info panel toggle
    toggleInfoBtn.addEventListener('click', () => {
        infoPanelVisible = !infoPanelVisible;
        infoPanel.classList.toggle('hidden', !infoPanelVisible);
        toggleInfoBtn.textContent = infoPanelVisible ? 'Hide Info' : 'Show Info';
        toggleInfoBtn.classList.toggle('panel-hidden', !infoPanelVisible);
    });
    
    // Add keyboard shortcut for toggling both panels
    document.addEventListener('keydown', function(event) {
        if (event.key === 'h' || event.key === 'H') {
            // Toggle both panels
            controlsPanelVisible = !controlsPanelVisible;
            infoPanelVisible = !infoPanelVisible;
            
            // Update controls panel
            controlsPanel.classList.toggle('hidden', !controlsPanelVisible);
            toggleControlsBtn.textContent = controlsPanelVisible ? 'Hide Controls' : 'Show Controls';
            toggleControlsBtn.classList.toggle('panel-hidden', !controlsPanelVisible);
            
            // Update info panel
            infoPanel.classList.toggle('hidden', !infoPanelVisible);
            toggleInfoBtn.textContent = infoPanelVisible ? 'Hide Info' : 'Show Info';
            toggleInfoBtn.classList.toggle('panel-hidden', !infoPanelVisible);
        }
    });
    
    console.log('Panel toggles initialized successfully');
}