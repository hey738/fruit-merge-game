// ==================== Responsive Scaling ====================
const BASE_WIDTH = 450;
const BASE_HEIGHT = 600;

function calcScale() {
    const container = document.querySelector('.game-container');
    const header = document.querySelector('header');
    const legend = document.querySelector('.fruit-legend');
    const headerH = header ? header.offsetHeight + 20 : 90;
    const legendH = legend ? legend.offsetHeight + 20 : 80;
    const availH = window.innerHeight * 0.95 - headerH - legendH - 20;
    const scaleH = availH / BASE_HEIGHT;
    // Let height determine scale, then constrain width to fit
    // On small screens width limits, on large screens height limits
    const maxW = container ? container.offsetWidth - 4 : BASE_WIDTH;
    const scaleW = maxW / BASE_WIDTH;
    return Math.min(scaleW, scaleH);
}

const SCALE = calcScale();
const GAME_WIDTH = Math.round(BASE_WIDTH * SCALE);
const GAME_HEIGHT = Math.round(BASE_HEIGHT * SCALE);

// Dynamically adjust container width to fit the scaled game
(function adjustContainer() {
    const container = document.querySelector('.game-container');
    if (container && GAME_WIDTH > 440) {
        container.style.maxWidth = (GAME_WIDTH + 44) + 'px';
    }
})();

// ==================== Matter.js Setup ====================
const Engine = Matter.Engine,
    Render = Matter.Render,
    Runner = Matter.Runner,
    World = Matter.World,
    Bodies = Matter.Bodies,
    Events = Matter.Events,
    Composite = Matter.Composite;

// ==================== Fruit Configuration ====================
const FRUITS = [
    { name: "grape", radius: Math.round(15 * SCALE), score: 10, color: "#8e44ad", emoji: "\u{1F347}" },
    { name: "strawberry", radius: Math.round(25 * SCALE), score: 20, color: "#e74c3c", emoji: "\u{1F353}" },
    { name: "tangerine", radius: Math.round(35 * SCALE), score: 30, color: "#e67e22", emoji: "\u{1F34A}" },
    { name: "banana", radius: Math.round(45 * SCALE), score: 40, color: "#f1c40f", emoji: "\u{1F34C}" },
    { name: "peach", radius: Math.round(60 * SCALE), score: 50, color: "#ff9ff3", emoji: "\u{1F351}" },
    { name: "melon", radius: Math.round(80 * SCALE), score: 60, color: "#2ecc71", emoji: "\u{1F348}" },
    { name: "watermelon", radius: Math.round(100 * SCALE), score: 70, color: "#27ae60", emoji: "\u{1F349}" }
];

// ==================== Game State ====================
let nextFruitIndex = 0;
let score = 0;
let bestScore = parseInt(localStorage.getItem('fruitMergeBest')) || 0;
let isGameOver = false;
let canDrop = true;
let gameOverTimer = 0;
let gameOverCheckInterval = null;
let currentFruitX = GAME_WIDTH / 2;

// ==================== Constants ====================
const DROP_Y = Math.round(50 * SCALE);
const LIMIT_Y = Math.round(150 * SCALE);
const DROP_COOLDOWN = 500;
const GAME_OVER_THRESHOLD = 3000;
const WALL_PADDING = 5;

// ==================== DOM Elements ====================
const scoreElement = document.getElementById("score");
const bestScoreElement = document.getElementById("best-score");
const nextFruitDisplay = document.getElementById("next-fruit-display");
const gameArea = document.getElementById("game-area");
const gameOverScreen = document.getElementById("game-over");
const finalScoreElement = document.getElementById("final-score");
const finalBestElement = document.getElementById("final-best");
const restartBtn = document.getElementById("restart-btn");

// ==================== Engine & Renderer ====================
const engine = Engine.create();
const world = engine.world;

const render = Render.create({
    element: gameArea,
    engine: engine,
    options: {
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
        wireframes: false,
        background: 'transparent',
        pixelRatio: window.devicePixelRatio
    }
});

// ==================== Boundary Walls ====================
const floor = Bodies.rectangle(GAME_WIDTH / 2, GAME_HEIGHT + 10, GAME_WIDTH + 10, 20, {
    isStatic: true,
    render: { visible: false }
});
const leftWall = Bodies.rectangle(-10, GAME_HEIGHT / 2, 20, GAME_HEIGHT, {
    isStatic: true,
    render: { visible: false }
});
const rightWall = Bodies.rectangle(GAME_WIDTH + 10, GAME_HEIGHT / 2, 20, GAME_HEIGHT, {
    isStatic: true,
    render: { visible: false }
});
const topSensor = Bodies.rectangle(GAME_WIDTH / 2, 0, GAME_WIDTH, 2, {
    isStatic: true,
    isSensor: true,
    render: { visible: false },
    label: "topSensor"
});

World.add(world, [floor, leftWall, rightWall, topSensor]);

const runner = Runner.create();

// Don't start engine/renderer yet — wait for splash screen start button

// ==================== Sound Effects ====================
let audioCtx = null;
function getAudioCtx() {
    if (!audioCtx) {
        try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { /* not supported */ }
    }
    return audioCtx;
}

function createSound(frequency, type, duration, volume) {
    return function () {
        const ctx = getAudioCtx();
        if (!ctx) return;
        try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(frequency, ctx.currentTime);
            gain.gain.setValueAtTime(volume, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + duration);
        } catch (e) { /* audio error */ }
    };
}

const playDrop = createSound(300, 'sine', 0.15, 0.3);
const playMerge = createSound(520, 'sine', 0.25, 0.4);

function playGameOver() {
    const ctx = getAudioCtx();
    if (!ctx) return;
    try {
        const notes = [400, 350, 300, 250];
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.15);
            gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.15);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.3);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime + i * 0.15);
            osc.stop(ctx.currentTime + i * 0.15 + 0.3);
        });
    } catch (e) { /* audio error */ }
}

// ==================== Merge Particle Effects ====================
let particles = [];

function createMergeParticles(x, y, color) {
    for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i) / 8;
        const speed = 2 + Math.random() * 3;
        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: 3 * SCALE + Math.random() * 3 * SCALE,
            color: color,
            alpha: 1,
            life: 30
        });
    }
}

function updateAndDrawParticles(context) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        p.life--;
        p.alpha = p.life / 30;

        if (p.life <= 0) {
            particles.splice(i, 1);
            continue;
        }

        context.save();
        context.globalAlpha = p.alpha;
        context.fillStyle = p.color;
        context.beginPath();
        context.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        context.fill();
        context.restore();
    }
}

// ==================== Score Popup Effects ====================
let scorePopups = [];

function createScorePopup(x, y, points) {
    scorePopups.push({
        x: x,
        y: y,
        text: '+' + points,
        alpha: 1,
        life: 40,
        vy: -1.5
    });
}

function updateAndDrawScorePopups(context) {
    for (let i = scorePopups.length - 1; i >= 0; i--) {
        const p = scorePopups[i];
        p.y += p.vy;
        p.life--;
        p.alpha = p.life / 40;

        if (p.life <= 0) {
            scorePopups.splice(i, 1);
            continue;
        }

        context.save();
        context.globalAlpha = p.alpha;
        context.fillStyle = '#ff7675';
        context.font = `bold ${14 * SCALE}px 'Noto Sans KR', sans-serif`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(p.text, p.x, p.y);
        context.restore();
    }
}

// ==================== Game Logic ====================
function initGame() {
    World.clear(world);
    Engine.clear(engine);
    World.add(world, [floor, leftWall, rightWall, topSensor]);

    score = 0;
    isGameOver = false;
    canDrop = true;
    gameOverTimer = 0;
    currentFruitX = GAME_WIDTH / 2;
    particles = [];
    scorePopups = [];

    updateScoreDisplay();
    gameOverScreen.classList.add("hidden");
    gameArea.classList.remove("danger-flash");

    // Clear and restart game over check interval
    if (gameOverCheckInterval) clearInterval(gameOverCheckInterval);
    gameOverCheckInterval = setInterval(checkGameOver, 1000);

    spawnNextFruit();
}

function spawnNextFruit() {
    const randomIndex = Math.floor(Math.random() * 3);
    nextFruitIndex = randomIndex;
    const nextFruit = FRUITS[nextFruitIndex];
    nextFruitDisplay.innerHTML = `<span style="font-size: ${20 * SCALE}px;">${nextFruit.emoji}</span>`;
}

function createFruit(x, y, index) {
    const fruit = FRUITS[index];
    return Bodies.circle(x, y, fruit.radius, {
        restitution: 0.2,
        render: { fillStyle: fruit.color },
        label: "fruit_" + index
    });
}

function dropFruit() {
    if (isGameOver || !canDrop) return;

    canDrop = false;
    const body = createFruit(currentFruitX, DROP_Y, nextFruitIndex);
    World.add(world, body);
    playDrop();

    setTimeout(() => {
        canDrop = true;
        spawnNextFruit();
    }, DROP_COOLDOWN);
}

function updateScoreDisplay() {
    scoreElement.innerText = score;
    if (bestScoreElement) bestScoreElement.innerText = bestScore;
}

function addScore(points) {
    score += points;
    updateScoreDisplay();
}

// ==================== Input: Mouse ====================
function getCanvasX(clientX) {
    const canvas = gameArea.querySelector('canvas');
    if (!canvas) return GAME_WIDTH / 2;
    const canvasRect = canvas.getBoundingClientRect();
    const relX = clientX - canvasRect.left;
    const scaleX = GAME_WIDTH / canvasRect.width;
    return relX * scaleX;
}

function updateCurrentFruitPosition(canvasX) {
    const radius = FRUITS[nextFruitIndex].radius;
    currentFruitX = Math.max(radius + WALL_PADDING, Math.min(canvasX, GAME_WIDTH - radius - WALL_PADDING));
}

gameArea.addEventListener("mousemove", (e) => {
    if (isGameOver || !canDrop) return;
    updateCurrentFruitPosition(getCanvasX(e.clientX));
});

gameArea.addEventListener("touchmove", (e) => {
    if (isGameOver || !canDrop) return;
    e.preventDefault();
    updateCurrentFruitPosition(getCanvasX(e.touches[0].clientX));
}, { passive: false });

gameArea.addEventListener("mouseup", (e) => {
    const canvas = gameArea.querySelector('canvas');
    if (!canvas) return;
    const canvasRect = canvas.getBoundingClientRect();
    const clickY = e.clientY - canvasRect.top;
    if (clickY < 0 || clickY > canvasRect.height) return;
    dropFruit();
});

gameArea.addEventListener("touchend", (e) => {
    e.preventDefault();
    dropFruit();
}, { passive: false });

// ==================== Input: Keyboard ====================
document.addEventListener("keydown", (e) => {
    if (isGameOver) {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            initGame();
        }
        return;
    }
    if (!canDrop) return;

    const moveStep = 10 * SCALE;
    switch (e.key) {
        case "ArrowLeft":
        case "a":
            e.preventDefault();
            updateCurrentFruitPosition(currentFruitX - moveStep);
            break;
        case "ArrowRight":
        case "d":
            e.preventDefault();
            updateCurrentFruitPosition(currentFruitX + moveStep);
            break;
        case " ":
        case "ArrowDown":
            e.preventDefault();
            dropFruit();
            break;
    }
});

// ==================== Rendering ====================
// Draw emoji on fruit bodies
Events.on(render, 'afterRender', function () {
    const context = render.context;
    const bodies = Composite.allBodies(engine.world);

    context.textAlign = "center";
    context.textBaseline = "middle";

    for (let i = 0; i < bodies.length; i++) {
        const body = bodies[i];
        if (body.label.startsWith('fruit_')) {
            const index = parseInt(body.label.split('_')[1]);
            const fruit = FRUITS[index];

            context.save();
            context.translate(body.position.x, body.position.y);
            context.rotate(body.angle);
            const fontSize = fruit.radius * 1.2;
            context.font = `${fontSize}px Arial`;
            context.fillText(fruit.emoji, 0, 0);
            context.restore();
        }
    }

    // Preview fruit + drop guideline
    if (canDrop && !isGameOver) {
        const fruit = FRUITS[nextFruitIndex];

        // Drop guideline
        context.save();
        context.beginPath();
        context.moveTo(currentFruitX, DROP_Y + fruit.radius);
        context.lineTo(currentFruitX, GAME_HEIGHT);
        context.strokeStyle = "rgba(180, 180, 180, 0.25)";
        context.lineWidth = 1;
        context.setLineDash([4, 6]);
        context.stroke();
        context.setLineDash([]);
        context.restore();

        // Preview fruit (semi-transparent)
        context.globalAlpha = 0.5;
        context.fillStyle = fruit.color;
        context.beginPath();
        context.arc(currentFruitX, DROP_Y, fruit.radius, 0, 2 * Math.PI);
        context.fill();

        context.globalAlpha = 1.0;
        context.font = `${fruit.radius * 1.2}px Arial`;
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(fruit.emoji, currentFruitX, DROP_Y);
    }

    // Limit line
    const dangerActive = gameOverTimer > 0;
    context.beginPath();
    context.moveTo(0, LIMIT_Y);
    context.lineTo(GAME_WIDTH, LIMIT_Y);
    if (dangerActive) {
        const pulse = 0.4 + 0.3 * Math.sin(Date.now() / 150);
        context.strokeStyle = `rgba(255, 80, 80, ${pulse})`;
        context.lineWidth = 5;
    } else {
        context.strokeStyle = "rgba(255, 118, 117, 0.4)";
        context.lineWidth = 3;
    }
    context.setLineDash([8, 8]);
    context.stroke();
    context.setLineDash([]);

    context.font = `${11 * SCALE}px 'Noto Sans KR', sans-serif`;
    context.fillStyle = dangerActive ? "rgba(255, 60, 60, 0.9)" : "rgba(255, 118, 117, 0.7)";
    context.textAlign = "right";
    context.fillText("LIMIT", GAME_WIDTH - 8, LIMIT_Y - 5 * SCALE);
    context.closePath();

    // Particles & score popups
    updateAndDrawParticles(context);
    updateAndDrawScorePopups(context);
});

// ==================== Collision / Merge ====================
const removedBodies = new Set();

Events.on(engine, 'collisionStart', (event) => {
    const pairs = event.pairs;

    for (let i = 0; i < pairs.length; i++) {
        const bodyA = pairs[i].bodyA;
        const bodyB = pairs[i].bodyB;

        if (!bodyA.label.startsWith('fruit_') || !bodyB.label.startsWith('fruit_')) continue;
        if (removedBodies.has(bodyA.id) || removedBodies.has(bodyB.id)) continue;

        const indexA = parseInt(bodyA.label.split('_')[1]);
        const indexB = parseInt(bodyB.label.split('_')[1]);

        if (indexA === indexB && indexA < FRUITS.length - 1) {
            const midX = (bodyA.position.x + bodyB.position.x) / 2;
            const midY = (bodyA.position.y + bodyB.position.y) / 2;

            removedBodies.add(bodyA.id);
            removedBodies.add(bodyB.id);
            World.remove(world, [bodyA, bodyB]);

            const points = FRUITS[indexA].score * 2;
            addScore(points);

            const newFruit = createFruit(midX, midY, indexA + 1);
            World.add(world, newFruit);

            createMergeParticles(midX, midY, FRUITS[indexA + 1].color);
            createScorePopup(midX, midY - 20 * SCALE, points);
            playMerge();
        }
    }
});

// Clean up removed body IDs periodically
setInterval(() => {
    const allIds = new Set(Composite.allBodies(world).map(b => b.id));
    for (const id of removedBodies) {
        if (!allIds.has(id)) removedBodies.delete(id);
    }
}, 5000);

// ==================== Game Over ====================
function checkGameOver() {
    if (isGameOver) return;

    const bodies = Composite.allBodies(world);
    let danger = false;

    for (const body of bodies) {
        if (body.label.startsWith('fruit_') && body.speed < 0.2) {
            if (body.position.y - body.circleRadius < LIMIT_Y) {
                danger = true;
                break;
            }
        }
    }

    if (danger) {
        gameOverTimer += 1000;
        gameArea.classList.add("danger-flash");
        if (gameOverTimer >= GAME_OVER_THRESHOLD) {
            endGame();
        }
    } else {
        gameOverTimer = 0;
        gameArea.classList.remove("danger-flash");
    }
}

function endGame() {
    isGameOver = true;
    canDrop = false;
    gameArea.classList.remove("danger-flash");

    if (gameOverCheckInterval) {
        clearInterval(gameOverCheckInterval);
        gameOverCheckInterval = null;
    }

    // Update best score
    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('fruitMergeBest', bestScore);
    }

    finalScoreElement.innerText = score;
    if (finalBestElement) finalBestElement.innerText = bestScore;
    updateScoreDisplay();

    gameOverScreen.classList.remove("hidden");
    playGameOver();

    // Stop physics after a short delay to let final animations play
    setTimeout(() => {
        Runner.stop(runner);
    }, 500);
}

// ==================== Restart ====================
restartBtn.addEventListener("click", () => {
    Runner.run(runner, engine);
    initGame();
});

// ==================== Splash Screen / Start ====================
const splashScreen = document.getElementById('splash-screen');
const startBtn = document.getElementById('start-btn');
const gameContainer = document.querySelector('.game-container');

function startGame() {
    // Fade out splash screen
    splashScreen.classList.add('fade-out');

    // Show game container
    gameContainer.classList.remove('game-hidden');
    gameContainer.classList.add('game-visible');

    // Start Matter.js engine & renderer
    Render.run(render);
    Runner.run(runner, engine);

    // Initialize the game
    updateScoreDisplay();
    initGame();
}

startBtn.addEventListener('click', startGame);
