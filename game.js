// Game state
let gameStarted = false;
let gameVolume = 0.5;

// Weapon system
let currentWeapon = null;
let isShooting = false;
const weapons = {
    glock: {
        name: 'Glock 18',
        bulletColor: 0xffff00,
        bulletSize: 0.1,
        bulletSpeed: 0.5,
        fireRate: 200,
        isAutomatic: false
    },
    ak47: {
        name: 'AK-47',
        bulletColor: 0x0000ff,
        bulletSize: 0.15,
        bulletSpeed: 0.7,
        fireRate: 100,
        isAutomatic: true
    }
};

let lastFireTime = 0;
const obstacles = [];

// UI Elements
const menu = document.getElementById('menu');
const settings = document.getElementById('settings');
const gameContainer = document.getElementById('gameContainer');
const controls = document.getElementById('controls');
const crosshair = document.getElementById('crosshair');
const score = document.getElementById('score');
const loading = document.getElementById('loading');
const playButton = document.getElementById('playButton');
const settingsButton = document.getElementById('settingsButton');
const backButton = document.getElementById('backButton');
const volumeSlider = document.getElementById('volumeSlider');
const weaponsMenu = document.getElementById('weapons');
const weaponsButton = document.getElementById('weaponsButton');
const glockButton = document.getElementById('glockButton');
const ak47Button = document.getElementById('ak47Button');
const backToMenuButton = document.getElementById('backToMenuButton');

// Menu Event Listeners
playButton.addEventListener('click', startGame);
settingsButton.addEventListener('click', showSettings);
backButton.addEventListener('click', hideSettings);
volumeSlider.addEventListener('input', updateVolume);

// Weapon menu event listeners
weaponsButton.addEventListener('click', () => {
    menu.classList.add('hidden');
    weaponsMenu.classList.remove('hidden');
});

backToMenuButton.addEventListener('click', () => {
    weaponsMenu.classList.add('hidden');
    menu.classList.remove('hidden');
});

glockButton.addEventListener('click', () => {
    currentWeapon = weapons.glock;
    weaponsMenu.classList.add('hidden');
    menu.classList.remove('hidden');
});

ak47Button.addEventListener('click', () => {
    currentWeapon = weapons.ak47;
    weaponsMenu.classList.add('hidden');
    menu.classList.remove('hidden');
});

function updateVolume() {
    gameVolume = volumeSlider.value / 100;
    audioPool.footsteps.forEach(sound => sound.setVolume(SOUNDS.enemyFootsteps.volume * gameVolume));
    audioPool.collision.forEach(sound => sound.setVolume(SOUNDS.enemyCollision.volume * gameVolume));
    audioPool.detect.forEach(sound => sound.setVolume(SOUNDS.enemyDetect.volume * gameVolume));
    console.log('Volume updated:', gameVolume);
}

function showSettings() {
    menu.classList.add('hidden');
    settings.classList.remove('hidden');
}

function hideSettings() {
    settings.classList.add('hidden');
    menu.classList.remove('hidden');
}

function startGame() {
    menu.classList.add('hidden');
    gameContainer.classList.remove('hidden');
    controls.classList.remove('hidden');
    crosshair.classList.remove('hidden');
    score.classList.remove('hidden');
    loading.classList.remove('hidden');
    
    initGame();
}

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x87CEEB);
document.getElementById('gameContainer').appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 10, 5);
scene.add(directionalLight);

// Audio System
const audioListener = new THREE.AudioListener();
camera.add(audioListener);

// Sound effects loader
const audioLoader = new THREE.AudioLoader();

// Sound effects configuration
const SOUNDS = {
    enemyFootsteps: {
        path: './sounds/enemy_footsteps.mp3',
        volume: 0.5,
        loop: true,
        maxDistance: 20,
        refDistance: 5
    },
    enemyCollision: {
        path: './sounds/enemy_collision.mp3',
        volume: 0.7,
        loop: false,
        maxDistance: 15,
        refDistance: 3
    },
    enemyDetect: {
        path: './sounds/enemy_detect.mp3',
        volume: 0.6,
        loop: false,
        maxDistance: 25,
        refDistance: 8
    }
};

// Simple Audio System
const gameAudio = {
    chaseMusic: null,
    isPlaying: false,

    init() {
        try {
            this.chaseMusic = new Audio('sounds/chase_music.mp3');
            this.chaseMusic.loop = true;
            this.chaseMusic.volume = 0;
            // Попереднє завантаження аудіо
            this.chaseMusic.load();
            console.log('Audio initialized successfully');
        } catch (error) {
            console.error('Audio initialization failed:', error);
        }
    },

    update(playerPosition, enemies) {
        if (!this.chaseMusic) return;

        try {
            // Знаходимо найближчого ворога
            let closestDistance = Infinity;
            for (const enemy of enemies) {
                const distance = enemy.position.distanceTo(playerPosition);
                if (distance < closestDistance) {
                    closestDistance = distance;
                }
            }

            // Управління музикою
            if (closestDistance < 20) {
                if (!this.isPlaying) {
                    this.chaseMusic.play().catch(err => console.log('Playback prevented:', err));
                    this.isPlaying = true;
                }
                // Плавна зміна гучності
                const targetVolume = Math.min(1, Math.max(0, 1 - (closestDistance - 10) / 10));
                this.chaseMusic.volume = targetVolume * gameVolume;
            } else if (this.isPlaying) {
                this.chaseMusic.volume = 0;
                this.chaseMusic.pause();
                this.chaseMusic.currentTime = 0;
                this.isPlaying = false;
            }
        } catch (error) {
            console.error('Audio update error:', error);
        }
    },

    updateVolume(volume) {
        if (this.chaseMusic && this.isPlaying) {
            this.chaseMusic.volume = volume;
        }
    }
};

// Audio configuration
const AUDIO_CONFIG = {
    chase: {
        file: 'sounds/chase_music.mp3',
        volume: 0.7,
        loop: true
    }
};

// Audio pool size for each sound type
const AUDIO_POOL_SIZE = 10;

// Audio pools for performance
const audioPool = {
    footsteps: [],
    collision: [],
    detect: []
};

// Initialize audio pools
function initAudioPool() {
    Object.keys(AUDIO_CONFIG).forEach(soundType => {
        for (let i = 0; i < AUDIO_POOL_SIZE; i++) {
            const sound = new THREE.PositionalAudio(audioListener);
            audioLoader.load(AUDIO_CONFIG[soundType].file, buffer => {
                sound.setBuffer(buffer);
                sound.setVolume(AUDIO_CONFIG[soundType].volume);
                sound.setLoop(AUDIO_CONFIG[soundType].loop);
                sound.setRefDistance(AUDIO_CONFIG[soundType].refDistance);
                sound.setMaxDistance(AUDIO_CONFIG[soundType].maxDistance);
                sound.setRolloffFactor(AUDIO_CONFIG[soundType].rolloffFactor);
            });
            audioPool[soundType].push({
                sound: sound,
                inUse: false,
                lastPlayed: 0
            });
        }
    });
}

// Get available sound from pool
function getAvailableSound(soundType) {
    const now = Date.now();
    for (let audio of audioPool[soundType]) {
        if (!audio.inUse && (now - audio.lastPlayed) > 100) {
            audio.inUse = true;
            audio.lastPlayed = now;
            return audio;
        }
    }
    return null;
}

// Release sound back to pool
function releaseSound(audio) {
    audio.inUse = false;
    audio.sound.stop();
}

// Create obstacles
function createObstacles() {
    const obstacleTextures = [
        'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/terrain/grasslight-big.jpg',
        'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/terrain/grasslight-big.jpg',
        'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/terrain/grasslight-big.jpg'
    ];

    const textureLoader = new THREE.TextureLoader();
    
    for (let i = 0; i < 20; i++) {
        const size = 2 + Math.random() * 3;
        const geometry = new THREE.BoxGeometry(size, size, size);
        
        const texture = textureLoader.load(obstacleTextures[Math.floor(Math.random() * obstacleTextures.length)]);
        const material = new THREE.MeshStandardMaterial({ 
            map: texture,
            roughness: 0.8,
            metalness: 0.2
        });
        
        const obstacle = new THREE.Mesh(geometry, material);
        
        const x = (Math.random() - 0.5) * 180;
        const z = (Math.random() - 0.5) * 180;
        obstacle.position.set(x, size/2, z);
        
        scene.add(obstacle);
        obstacles.push(obstacle);
    }
}

// Create ground
const groundGeometry = new THREE.BoxGeometry(180, 1, 180);
const groundMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x3CB371,
    roughness: 0.8,
    metalness: 0.2
});

const textureLoader = new THREE.TextureLoader();
const gridTexture = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/terrain/grasslight-big.jpg');
gridTexture.wrapS = THREE.RepeatWrapping;
gridTexture.wrapT = THREE.RepeatWrapping;
gridTexture.repeat.set(60, 60);
groundMaterial.map = gridTexture;

const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.position.y = -0.5;
scene.add(ground);

// Player setup
const PLAYER_HEIGHT = 2;
const PLAYER_CROUCH_HEIGHT = 1;
const PLAYER_RADIUS = 0.5;
let isCrouching = false;
const CROUCH_TRANSITION_SPEED = 0.1;
let currentPlayerHeight = PLAYER_HEIGHT;
const playerGeometry = new THREE.CylinderGeometry(PLAYER_RADIUS, PLAYER_RADIUS, PLAYER_HEIGHT, 8);
const playerMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
const player = new THREE.Mesh(playerGeometry, playerMaterial);
player.position.set(0, PLAYER_HEIGHT / 2, 0);
scene.add(player);

// Enemy setup
const enemies = [];
let modelLoaded = false;
const MAX_ENEMIES = 10;
const SPAWN_INTERVAL = 2000;
let spawnTimer = null;

// Enemy movement constants
const ENEMY_MAX_SPEED = 0.075;
const ENEMY_MIN_SPEED = 0.0075;
const ENEMY_ACCELERATION = 0.0015;
const ENEMY_COLLISION_RECOVERY_TIME = 1500;
const OBSTACLE_AVOIDANCE_RADIUS = 4;
const AVOIDANCE_WEIGHT = 0.6;
const COLLISION_SLOWDOWN = 0.4;
const SPEED_RECOVERY_RATE = 0.02;

// Chase Music System Configuration
const CHASE_MUSIC = {
    file: './sounds/chase_music.mp3',
    volume: 0.0,
    targetVolume: 0.7,
    fadeSpeed: 0.05,
    minDistance: 15,
    maxDistance: 30,
    isPlaying: false
};

// Initialize chase music
const chaseMusicSystem = {
    audio: new Audio(CHASE_MUSIC.file),
    fadeInterval: null,
    activeEnemies: new Set(),
    
    init() {
        this.audio.loop = true;
        this.audio.volume = CHASE_MUSIC.volume;
        this.audio.preload = 'auto';
        
        // Створюємо AudioContext для аналізу звуку
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createMediaElementSource(this.audio);
        const gainNode = audioContext.createGain();
        const analyser = audioContext.createAnalyser();
        
        source.connect(analyser);
        analyser.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        this.gainNode = gainNode;
        this.analyser = analyser;
    },
    
    update() {
        const playerPosition = player.position;
        let closestDistance = Infinity;
        
        // Перевіряємо відстань до кожного ворога
        enemies.forEach(enemy => {
            const distance = enemy.position.distanceTo(playerPosition);
            if (distance < closestDistance) {
                closestDistance = distance;
            }
            
            // Додаємо ворога до активних, якщо він близько
            if (distance < CHASE_MUSIC.minDistance) {
                this.activeEnemies.add(enemy.id);
            } else if (distance > CHASE_MUSIC.maxDistance) {
                this.activeEnemies.delete(enemy.id);
            }
        });
        
        // Управління музикою на основі кількості активних ворогів
        if (this.activeEnemies.size > 0 && !CHASE_MUSIC.isPlaying) {
            this.startChaseMusic();
        } else if (this.activeEnemies.size === 0 && CHASE_MUSIC.isPlaying) {
            this.stopChaseMusic();
        }
        
        // Динамічне регулювання гучності на основі відстані
        if (CHASE_MUSIC.isPlaying) {
            const distanceFactor = Math.max(0, Math.min(1, 
                1 - (closestDistance - CHASE_MUSIC.minDistance) / 
                (CHASE_MUSIC.maxDistance - CHASE_MUSIC.minDistance)
            ));
            const targetVolume = CHASE_MUSIC.targetVolume * distanceFactor * gameVolume;
            this.fadeToVolume(targetVolume);
        }
    },
    
    startChaseMusic() {
        if (!CHASE_MUSIC.isPlaying) {
            CHASE_MUSIC.isPlaying = true;
            this.audio.currentTime = 0;
            this.audio.play().catch(console.error);
            this.startVolumeFade(true);
        }
    },
    
    stopChaseMusic() {
        if (CHASE_MUSIC.isPlaying) {
            this.startVolumeFade(false);
        }
    },
    
    startVolumeFade(fadeIn) {
        if (this.fadeInterval) clearInterval(this.fadeInterval);
        
        this.fadeInterval = setInterval(() => {
            const targetVolume = fadeIn ? CHASE_MUSIC.targetVolume : 0;
            const currentVolume = this.audio.volume;
            const newVolume = fadeIn ? 
                Math.min(targetVolume, currentVolume + CHASE_MUSIC.fadeSpeed) :
                Math.max(0, currentVolume - CHASE_MUSIC.fadeSpeed);
                
            this.audio.volume = newVolume * gameVolume;
            
            if ((!fadeIn && newVolume === 0) || (fadeIn && newVolume === targetVolume)) {
                clearInterval(this.fadeInterval);
                this.fadeInterval = null;
                if (!fadeIn) {
                    this.audio.pause();
                    CHASE_MUSIC.isPlaying = false;
                }
            }
        }, 50);
    },
    
    fadeToVolume(targetVolume) {
        this.audio.volume = targetVolume;
    },
    
    updateGameVolume(volume) {
        if (CHASE_MUSIC.isPlaying) {
            this.audio.volume = CHASE_MUSIC.targetVolume * volume;
        }
    }
};

// Create enemy
function createEnemy() {
    const loader = new THREE.FBXLoader();
    const enemy = new THREE.Group();
    
    enemy.userData = {
        currentSpeed: ENEMY_MAX_SPEED,
        lastCollisionTime: 0,
        isRecovering: false,
        avoidanceDirection: new THREE.Vector3(),
        lastAvoidanceUpdate: 0,
        footstepsSound: null,
        lastSoundTime: 0,
        hasDetectedPlayer: false,
        sounds: {
            footsteps: null,
            lastCollisionSound: 0,
            lastDetectSound: 0
        },
        id: Math.random().toString(36).substr(2, 9) // Унікальний ID для кожного ворога
    };

    // Add footsteps sound to enemy
    const footstepsSound = getAvailableSound('footsteps');
    if (footstepsSound) {
        enemy.add(footstepsSound);
        enemy.userData.footstepsSound = footstepsSound;
    }

    loader.load(
        './tralalelo-tralala-shark/source/Shark_Sneaker_Strut_0330050517_texture_fbx/Shark_Sneaker_Strut_0330050517_texture.fbx',
        (fbx) => {
            const textureLoader = new THREE.TextureLoader();
            const texture = textureLoader.load(
                './tralalelo-tralala-shark/source/Shark_Sneaker_Strut_0330050517_texture_fbx/Shark_Sneaker_Strut_0333050517_texture.png',
                () => {
                    console.log('Texture loaded successfully');
                }
            );

            fbx.traverse((child) => {
                if (child.isMesh) {
                    child.material.map = texture;
                    child.material.needsUpdate = true;
                }
            });

            fbx.scale.set(0.02, 0.02, 0.02);
            enemy.add(fbx);
            modelLoaded = true;
            console.log('FBX model loaded successfully');
            loading.classList.add('hidden');
        },
        (progress) => {
            console.log('Loading progress:', (progress.loaded / progress.total * 100) + '%');
        },
        (error) => {
            console.error('Error loading FBX:', error);
            const bodyGeometry = new THREE.BoxGeometry(2, 1, 1.5);
            const bodyMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x607D8B,
                roughness: 0.7,
                metalness: 0.3
            });
            const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
            enemy.add(body);

            const finGeometry = new THREE.ConeGeometry(0.5, 1, 4);
            const finMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x455A64,
                roughness: 0.7,
                metalness: 0.3
            });
            const fin = new THREE.Mesh(finGeometry, finMaterial);
            fin.rotation.z = Math.PI;
            fin.position.y = 0.5;
            enemy.add(fin);

            const tailGeometry = new THREE.BoxGeometry(0.5, 0.8, 0.2);
            const tail = new THREE.Mesh(tailGeometry, finMaterial);
            tail.position.x = -1.2;
            enemy.add(tail);
            loading.classList.add('hidden');
        }
    );
    return enemy;
}

function spawnEnemy() {
    if (enemies.length < MAX_ENEMIES) {
        const enemy = createEnemy();
        const angle = Math.random() * Math.PI * 2;
        const distance = 15 + Math.random() * 10;
        
        const x = Math.sin(angle) * distance;
        const z = Math.cos(angle) * distance;
        
        const bounds = 28;
        const newX = Math.max(-bounds, Math.min(bounds, x));
        const newZ = Math.max(-bounds, Math.min(bounds, z));
        
        enemy.position.set(newX, 1, newZ);
        scene.add(enemy);
        enemies.push(enemy);
        console.log('Enemy spawned. Total enemies:', enemies.length);
    }
}

function startEnemySpawning() {
    if (spawnTimer) {
        clearInterval(spawnTimer);
    }
    spawnTimer = setInterval(spawnEnemy, SPAWN_INTERVAL);
}

function stopEnemySpawning() {
    if (spawnTimer) {
        clearInterval(spawnTimer);
        spawnTimer = null;
    }
}

// First person camera setup
camera.position.set(0, PLAYER_HEIGHT, 0);
let cameraRotation = new THREE.Vector2(0, 0);
let isPointerLocked = false;
const MAX_VERTICAL_ANGLE = Math.PI / 6;
const MOUSE_SENSITIVITY = 0.002;
const MOVE_SPEED = 0.1;

// Pointer lock setup
renderer.domElement.addEventListener('click', () => {
    if (!isPointerLocked) {
        renderer.domElement.requestPointerLock();
    }
});

document.addEventListener('pointerlockchange', () => {
    isPointerLocked = document.pointerLockElement === renderer.domElement;
});

// Mouse look
document.addEventListener('mousemove', (e) => {
    if (isPointerLocked) {
        cameraRotation.y -= e.movementX * MOUSE_SENSITIVITY;
        cameraRotation.x -= e.movementY * MOUSE_SENSITIVITY;
        cameraRotation.x = Math.max(-MAX_VERTICAL_ANGLE, Math.min(MAX_VERTICAL_ANGLE, cameraRotation.x));
    }
});

// Movement
const keys = {};
let playerVelocity = new THREE.Vector3();
let isJumping = false;
const jumpForce = 0.15;
const gravity = 0.008;

// Key handling
window.addEventListener('keydown', function(e) {
    if (e.key.toLowerCase() === 'w' || e.key === 'ArrowUp') keys['w'] = true;
    if (e.key.toLowerCase() === 's' || e.key === 'ArrowDown') keys['s'] = true;
    if (e.key.toLowerCase() === 'a' || e.key === 'ArrowLeft') keys['a'] = true;
    if (e.key.toLowerCase() === 'd' || e.key === 'ArrowRight') keys['d'] = true;
    if (e.key === ' ') keys['space'] = true;
    if (e.key.toLowerCase() === 'c') keys['crouch'] = true;
    if (e.key === 'Escape') {
        document.exitPointerLock();
        showMenu();
    }
});

window.addEventListener('keyup', function(e) {
    if (e.key.toLowerCase() === 'w' || e.key === 'ArrowUp') keys['w'] = false;
    if (e.key.toLowerCase() === 's' || e.key === 'ArrowDown') keys['s'] = false;
    if (e.key.toLowerCase() === 'a' || e.key === 'ArrowLeft') keys['a'] = false;
    if (e.key.toLowerCase() === 'd' || e.key === 'ArrowRight') keys['d'] = false;
    if (e.key === ' ') keys['space'] = false;
    if (e.key.toLowerCase() === 'c') keys['crouch'] = false;
});

function showMenu() {
    gameContainer.classList.add('hidden');
    controls.classList.add('hidden');
    crosshair.classList.add('hidden');
    score.classList.add('hidden');
    menu.classList.remove('hidden');
    gameStarted = false;
    stopEnemySpawning();
}

// Player physics
const GRAVITY = 0.02;
const JUMP_FORCE = 0.3;
let verticalVelocity = 0;

// Bullet setup
const bullets = [];
const BULLET_SPEED = 1.0;
const BULLET_DISTANCE = 30;
const BULLET_SIZE = 0.05;

// Create bullet
function createBullet() {
    if (!currentWeapon) return;
    
    const now = Date.now();
    if (now - lastFireTime < currentWeapon.fireRate) return;
    lastFireTime = now;

    const bulletGeometry = new THREE.SphereGeometry(currentWeapon.bulletSize, 16, 16);
    const bulletMaterial = new THREE.MeshStandardMaterial({ 
        color: currentWeapon.bulletColor,
        roughness: 0.3,
        metalness: 0.7
    });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
    
    bullet.position.copy(camera.position);
    
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(camera.quaternion);
    bullet.userData.velocity = direction.multiplyScalar(BULLET_SPEED);
    
    scene.add(bullet);
    bullets.push(bullet);
    
    setTimeout(() => {
        scene.remove(bullet);
        const index = bullets.indexOf(bullet);
        if (index !== -1) {
            bullets.splice(index, 1);
        }
    }, 2000);
}

// Check bullet collision with obstacles
function checkBulletCollision(bullet) {
    for (const obstacle of obstacles) {
        const distance = bullet.position.distanceTo(obstacle.position);
        if (distance < obstacle.geometry.parameters.width) {
            return true;
        }
    }
    return false;
}

// Update bullets
function updateBullets() {
    bullets.forEach((bullet, index) => {
        bullet.position.add(bullet.userData.velocity);
        
        if (checkBulletCollision(bullet)) {
            scene.remove(bullet);
            bullets.splice(index, 1);
            return;
        }
        
        enemies.forEach((enemy, enemyIndex) => {
            const distance = bullet.position.distanceTo(enemy.position);
            if (distance < 1.5) {
                scene.remove(bullet);
                bullets.splice(index, 1);
                
                scene.remove(enemy);
                enemies.splice(enemyIndex, 1);
                
                score += 100;
                document.getElementById('scoreValue').textContent = score;
            }
        });
    });
}

// Mouse event listeners
renderer.domElement.addEventListener('mousedown', (event) => {
    if (isPointerLocked && gameStarted && currentWeapon && event.button === 0) {
        isShooting = true;
        if (currentWeapon.isAutomatic) {
            createBullet();
        }
    }
});

renderer.domElement.addEventListener('mouseup', (event) => {
    if (event.button === 0) {
        isShooting = false;
    }
});

// Animation loop
function animate() {
    if (!gameStarted) return;
    
    requestAnimationFrame(animate);
    
    if (isShooting && currentWeapon && currentWeapon.isAutomatic) {
        createBullet();
    }
    
    movePlayer();
    updateEnemies();
    updateBullets();
    checkCollisions();
    renderer.render(scene, camera);
}

// Initialize game
function initGame() {
    gameStarted = true;
    gameAudio.init();
    respawnPlayer();
    enemies.forEach(enemy => scene.remove(enemy));
    enemies.length = 0;
    createObstacles();
    startEnemySpawning();
    animate();
}

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Player movement and control functions
function movePlayer() {
    const moveDirection = new THREE.Vector3();

    if (keys['w']) {
        moveDirection.z -= 1;
    }
    if (keys['s']) {
        moveDirection.z += 1;
    }
    if (keys['a']) {
        moveDirection.x -= 1;
    }
    if (keys['d']) {
        moveDirection.x += 1;
    }

    // Handle crouching
    if (keys['crouch']) {
        if (!isCrouching) {
            isCrouching = true;
        }
    } else {
        if (isCrouching) {
            isCrouching = false;
        }
    }

    // Smooth crouch transition
    const targetHeight = isCrouching ? PLAYER_CROUCH_HEIGHT : PLAYER_HEIGHT;
    currentPlayerHeight += (targetHeight - currentPlayerHeight) * CROUCH_TRANSITION_SPEED;

    // Update player model height
    player.scale.y = currentPlayerHeight / PLAYER_HEIGHT;
    player.position.y = currentPlayerHeight / 2;

    // Стрибок (тільки якщо не в присіді)
    if (keys['space'] && !isJumping && !isCrouching) {
        verticalVelocity = JUMP_FORCE;
        isJumping = true;
    }

    // Застосовуємо гравітацію
    verticalVelocity -= GRAVITY;
    player.position.y += verticalVelocity;

    // Перевіряємо зіткнення з землею
    if (player.position.y < currentPlayerHeight / 2) {
        player.position.y = currentPlayerHeight / 2;
        verticalVelocity = 0;
        isJumping = false;
    }

    // Нормалізуємо вектор руху
    if (moveDirection.length() > 0) {
        moveDirection.normalize();
    }

    // Застосовуємо обертання камери до напрямку руху
    moveDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraRotation.y);

    // Застосовуємо швидкість руху (повільніше в присіді)
    const currentMoveSpeed = isCrouching ? MOVE_SPEED * 0.5 : MOVE_SPEED;
    playerVelocity.x = moveDirection.x * currentMoveSpeed;
    playerVelocity.z = moveDirection.z * currentMoveSpeed;

    // Оновлюємо позицію гравця
    player.position.x += playerVelocity.x;
    player.position.z += playerVelocity.z;

    // Оновлюємо позицію камери з урахуванням присідання
    camera.position.copy(player.position);
    camera.position.y = player.position.y + currentPlayerHeight / 2;

    // Оновлюємо обертання камери
    camera.rotation.set(0, 0, 0);
    camera.rotateY(cameraRotation.y);
    camera.rotateX(cameraRotation.x);
}

function respawnPlayer() {
    player.position.set(0, PLAYER_HEIGHT / 2, 0);
    playerVelocity.set(0, 0, 0);
    cameraRotation.set(0, 0);
    verticalVelocity = 0;
    isJumping = false;
}

// Check collision between enemy and obstacles
function checkEnemyObstacleCollision(enemy, nextPosition) {
    for (const obstacle of obstacles) {
        const obstacleSize = obstacle.geometry.parameters.width;
        const distance = nextPosition.distanceTo(obstacle.position);
        
        if (distance < obstacleSize / 1.5) {
            return true;
        }
    }
    return false;
}

// Calculate avoidance direction for obstacles
function calculateAvoidanceDirection(enemy, obstacles) {
    const avoidanceDirection = new THREE.Vector3();
    let nearestDistance = Infinity;
    let hasNearbyObstacles = false;

    for (const obstacle of obstacles) {
        const toObstacle = new THREE.Vector3()
            .subVectors(obstacle.position, enemy.position);
        const distance = toObstacle.length();
        
        if (distance < OBSTACLE_AVOIDANCE_RADIUS) {
            hasNearbyObstacles = true;
            // Сила відштовхування обернено пропорційна відстані
            const force = 1 - (distance / OBSTACLE_AVOIDANCE_RADIUS);
            // Нормалізований вектор від перешкоди
            const avoidVector = toObstacle.normalize().multiplyScalar(-force);
            avoidanceDirection.add(avoidVector);
            
            if (distance < nearestDistance) {
                nearestDistance = distance;
            }
        }
    }

    if (hasNearbyObstacles) {
        avoidanceDirection.normalize();
    }

    return {
        direction: avoidanceDirection,
        hasObstacles: hasNearbyObstacles,
        nearestDistance: nearestDistance
    };
}

// Update enemy movement with improved obstacle avoidance
function updateEnemies() {
    const currentTime = Date.now();
    
    enemies.forEach((enemy, index) => {
        // Get direction to player
        const directionToPlayer = new THREE.Vector3()
            .subVectors(player.position, enemy.position)
            .normalize();
        
        // Check if enemy detects player
        const distanceToPlayer = enemy.position.distanceTo(player.position);
        if (distanceToPlayer < OBSTACLE_AVOIDANCE_RADIUS * 2 && !enemy.userData.hasDetectedPlayer) {
            const detectSound = getAvailableSound('detect');
            if (detectSound) {
                enemy.add(detectSound);
                detectSound.play();
                enemy.userData.hasDetectedPlayer = true;
            }
        }

        // Handle footsteps sound
        if (enemy.userData.footstepsSound && enemy.userData.currentSpeed > ENEMY_MIN_SPEED) {
            if (!enemy.userData.footstepsSound.isPlaying) {
                enemy.userData.footstepsSound.play();
            }
        }

        // Calculate separation force from other enemies
        const separationForce = new THREE.Vector3();
        enemies.forEach((otherEnemy, otherIndex) => {
            if (index !== otherIndex) {
                const distance = enemy.position.distanceTo(otherEnemy.position);
                if (distance < 5) {
                    const pushDirection = new THREE.Vector3()
                        .subVectors(enemy.position, otherEnemy.position)
                        .normalize()
                        .multiplyScalar(1 - distance/5);
                    separationForce.add(pushDirection);
                }
            }
        });

        // Calculate obstacle avoidance
        const avoidance = calculateAvoidanceDirection(enemy, obstacles);
        
        // Combine all movement vectors
        let finalDirection = new THREE.Vector3();
        
        if (avoidance.hasObstacles) {
            finalDirection.add(avoidance.direction.multiplyScalar(AVOIDANCE_WEIGHT));
            finalDirection.add(directionToPlayer.multiplyScalar(1 - AVOIDANCE_WEIGHT));
        } else {
            finalDirection.copy(directionToPlayer);
        }
        
        finalDirection.add(separationForce.multiplyScalar(0.3));
        finalDirection.normalize();

        // Calculate next position
        const nextPosition = enemy.position.clone().add(
            finalDirection.multiplyScalar(enemy.userData.currentSpeed)
        );

        // Handle collision sound
        if (checkEnemyObstacleCollision(enemy, nextPosition)) {
            const collisionSound = getAvailableSound('collision');
            if (collisionSound && currentTime - enemy.userData.lastSoundTime > 1000) {
                enemy.add(collisionSound);
                collisionSound.play();
                enemy.userData.lastSoundTime = currentTime;
            }
            
            // Різке сповільнення при зіткненні
            enemy.userData.currentSpeed *= COLLISION_SLOWDOWN;
            enemy.userData.lastCollisionTime = currentTime;
            enemy.userData.isRecovering = true;
        } else {
            // Оновлення швидкості
            if (enemy.userData.isRecovering) {
                const timeSinceCollision = currentTime - enemy.userData.lastCollisionTime;
                if (timeSinceCollision > ENEMY_COLLISION_RECOVERY_TIME) {
                    // Поступове відновлення швидкості
                    enemy.userData.currentSpeed = Math.min(
                        enemy.userData.currentSpeed + SPEED_RECOVERY_RATE,
                        ENEMY_MAX_SPEED
                    );
                    
                    if (enemy.userData.currentSpeed >= ENEMY_MAX_SPEED) {
                        enemy.userData.isRecovering = false;
                    }
                }
            } else if (avoidance.hasObstacles) {
                // Сповільнення при наближенні до перешкод
                const slowdownFactor = Math.max(0.5, avoidance.nearestDistance / OBSTACLE_AVOIDANCE_RADIUS);
                enemy.userData.currentSpeed = Math.max(
                    ENEMY_MIN_SPEED,
                    enemy.userData.currentSpeed * slowdownFactor
                );
            } else {
                // Прискорення на відкритому просторі
                enemy.userData.currentSpeed = Math.min(
                    enemy.userData.currentSpeed + ENEMY_ACCELERATION,
                    ENEMY_MAX_SPEED
                );
            }
        }

        // Update position if not in collision
        if (!checkEnemyObstacleCollision(enemy, nextPosition)) {
            enemy.position.copy(nextPosition);
        }
        enemy.position.y = 1; // Keep enemy at constant height

        // Update rotation smoothly
        if (finalDirection.length() > 0.001) {
            const targetRotation = Math.atan2(finalDirection.x, finalDirection.z);
            enemy.rotation.y = targetRotation;
        }

        // Handle footstep sounds
        if (enemy.velocity.length() > 0.1) {
            if (!enemy.sounds.footsteps) {
                const audio = getAvailableSound('footsteps');
                if (audio) {
                    enemy.sounds.footsteps = audio;
                    audio.sound.position.copy(enemy.position);
                    audio.sound.play();
                }
            } else {
                enemy.sounds.footsteps.sound.position.copy(enemy.position);
            }
        } else if (enemy.sounds.footsteps) {
            releaseSound(enemy.sounds.footsteps);
            enemy.sounds.footsteps = null;
        }

        // Handle collision sounds
        if (enemy.isColliding && Date.now() - enemy.sounds.lastCollisionSound > 500) {
            const audio = getAvailableSound('collision');
            if (audio) {
                audio.sound.position.copy(enemy.position);
                audio.sound.play();
                enemy.sounds.lastCollisionSound = Date.now();
                setTimeout(() => releaseSound(audio), 1000);
            }
        }

        // Handle detect sounds
        if (enemy.hasDetectedPlayer && Date.now() - enemy.sounds.lastDetectSound > 3000) {
            const audio = getAvailableSound('detect');
            if (audio) {
                audio.sound.position.copy(enemy.position);
                audio.sound.play();
                enemy.sounds.lastDetectSound = Date.now();
                setTimeout(() => releaseSound(audio), 1000);
            }
        }
    });

    // Оновлюємо систему музики погоні
    gameAudio.update(player.position, enemies);
}

function checkCollisions() {
    enemies.forEach(enemy => {
        const distance = player.position.distanceTo(enemy.position);
        if (distance < 1.5) {
            respawnPlayer();
            respawnEnemies();
        }
    });
}

function respawnEnemies() {
    enemies.forEach(enemy => {
        const angle = Math.random() * Math.PI * 2;
        const distance = 15 + Math.random() * 10;
        
        const x = Math.sin(angle) * distance;
        const z = Math.cos(angle) * distance;
        
        const bounds = 28;
        const newX = Math.max(-bounds, Math.min(bounds, x));
        const newZ = Math.max(-bounds, Math.min(bounds, z));
        
        enemy.position.set(newX, 1, newZ);
    });
}

// Start the game
initGame();

// Модифікуємо функцію updateGameVolume
function updateGameVolume(volume) {
    gameVolume = volume;
    gameAudio.updateVolume(volume);
} 