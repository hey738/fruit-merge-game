const Engine = Matter.Engine,
    Render = Matter.Render,
    Runner = Matter.Runner,
    World = Matter.World,
    Bodies = Matter.Bodies,
    Events = Matter.Events,
    Composite = Matter.Composite;

// Fruit configuration
// Fruit configuration
const FRUITS = [
    { name: "grape", radius: 15, score: 10, color: "#8e44ad", emoji: "🍇" },
    { name: "strawberry", radius: 25, score: 20, color: "#e74c3c", emoji: "🍓" },
    { name: "tangerine", radius: 35, score: 30, color: "#e67e22", emoji: "🍊" },
    { name: "banana", radius: 45, score: 40, color: "#f1c40f", emoji: "🍌" },
    { name: "peach", radius: 60, score: 50, color: "#ff9ff3", emoji: "🍑" },
    { name: "melon", radius: 80, score: 60, color: "#2ecc71", emoji: "🍈" },
    { name: "watermelon", radius: 100, score: 70, color: "#27ae60", emoji: "🍉" }
];

let currentFruit = null;
let nextFruitIndex = 0;
let score = 0;
let isGameOver = false;
let canDrop = true;

const engine = Engine.create();
const world = engine.world;

// DOM Elements
const scoreElement = document.getElementById("score");
const nextFruitDisplay = document.getElementById("next-fruit-display");
const gameArea = document.getElementById("game-area");
const gameOverScreen = document.getElementById("game-over");
const finalScoreElement = document.getElementById("final-score");
const restartBtn = document.getElementById("restart-btn");

// Canvas setup
const render = Render.create({
    element: gameArea,
    engine: engine,
    options: {
        width: 450,
        height: 600,
        wireframes: false,
        background: 'transparent', // Let CSS handle background
        pixelRatio: window.devicePixelRatio
    }
});

// Boundary Walls (Invisible or styled)
// We'll make them invisible for the cleaner look, relying on the container border
const floor = Bodies.rectangle(225, 610, 450, 20, {
    isStatic: true,
    render: { visible: false }
});
const leftWall = Bodies.rectangle(-10, 300, 20, 600, {
    isStatic: true,
    render: { visible: false }
});
const rightWall = Bodies.rectangle(460, 300, 20, 600, {
    isStatic: true,
    render: { visible: false }
}); // Make walls slightly wider/off-screen to avoid visual glitches
const topSensor = Bodies.rectangle(225, 0, 450, 2, {
    isStatic: true,
    isSensor: true,
    render: { visible: false },
    label: "topSensor"
});

World.add(world, [floor, leftWall, rightWall, topSensor]);

Render.run(render);
const runner = Runner.create();
Runner.run(runner, engine);

// Game Logic
function initGame() {
    World.clear(world); // Clears all bodies
    Engine.clear(engine); // Clears engine state

    // Re-add static bodies
    World.add(world, [floor, leftWall, rightWall, topSensor]);

    score = 0;
    isGameOver = false;
    canDrop = true;
    updateScore(0);
    gameOverScreen.classList.add("hidden");

    spawnNextFruit(); // Prepare the first fruit
}

function spawnNextFruit() {
    // Determine next fruit (random small fruit: grape to tangerine)
    const randomIndex = Math.floor(Math.random() * 3);
    nextFruitIndex = randomIndex;

    // Update next fruit display
    const nextFruit = FRUITS[nextFruitIndex];
    nextFruitDisplay.innerHTML = `<span style="font-size: 24px;">${nextFruit.emoji}</span>`;

    /* 
       Note: The "current fruit/dropping fruit" is typically handled by 
       showing a preview at the top and dropping it on click. 
       We'll implement a simple version where we track mouse/touch x 
       and spawn the body there.
    */
}

function createFruit(x, y, index, isStatic = false) {
    const fruit = FRUITS[index];
    const body = Bodies.circle(x, y, fruit.radius, {
        restitution: 0.2,
        render: {
            fillStyle: fruit.color
        },
        label: "fruit_" + index
    });
    return body;
}

// Custom Renderer for Emojis
Events.on(render, 'afterRender', function () {
    const context = render.context;
    const bodies = Composite.allBodies(engine.world);

    context.font = "30px Arial";
    context.textAlign = "center";
    context.textBaseline = "middle";

    for (let i = 0; i < bodies.length; i += 1) {
        const body = bodies[i];
        if (body.label.startsWith('fruit_')) {
            const index = parseInt(body.label.split('_')[1]);
            const fruit = FRUITS[index];

            context.save();
            context.translate(body.position.x, body.position.y);
            context.rotate(body.angle);
            // Scale font size based on radius
            const fontSize = fruit.radius * 1.2;
            context.font = `${fontSize}px Arial`;
            context.fillText(fruit.emoji, 0, 0);
            context.restore();
        }
    }
});

// Input Handling
let currentFruitX = 225; // Start center

// Mouse Move / Touch Move to position the fruit
gameArea.addEventListener("mousemove", (e) => {
    if (isGameOver || !canDrop) return;
    const rect = gameArea.getBoundingClientRect();
    updateCurrentFruitPosition(e.clientX - rect.left);
});

gameArea.addEventListener("touchmove", (e) => {
    if (isGameOver || !canDrop) return;
    const rect = gameArea.getBoundingClientRect();
    updateCurrentFruitPosition(e.touches[0].clientX - rect.left);
});

// Click / Touch End to drop
gameArea.addEventListener("mouseup", () => dropFruit());
gameArea.addEventListener("touchend", () => dropFruit());

function updateCurrentFruitPosition(x) {
    const radius = FRUITS[nextFruitIndex].radius;
    // Clamp
    currentFruitX = Math.max(radius + 10, Math.min(x, 450 - radius - 10));
}

function dropFruit() {
    if (isGameOver || !canDrop) return;

    canDrop = false;
    const body = createFruit(currentFruitX, 50, nextFruitIndex);
    World.add(world, body);

    setTimeout(() => {
        canDrop = true;
        spawnNextFruit();
    }, 500);
}

// Render the "Ready" fruit (the one at the top waiting to drop)
Events.on(render, 'afterRender', function () {
    const context = render.context;

    // Draw the "Preview" fruit at top if canDrop is true
    if (canDrop && !isGameOver) {
        const fruit = FRUITS[nextFruitIndex];
        context.globalAlpha = 0.5; // Transparent preview
        context.fillStyle = fruit.color;
        context.beginPath();
        context.arc(currentFruitX, 50, fruit.radius, 0, 2 * Math.PI);
        context.fill();

        context.globalAlpha = 1.0;
        context.font = `${fruit.radius * 1.2}px Arial`;
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(fruit.emoji, currentFruitX, 50);
    }
});

// Collision Handling (Merging)
Events.on(engine, 'collisionStart', (event) => {
    const pairs = event.pairs;

    for (let i = 0; i < pairs.length; i++) {
        const bodyA = pairs[i].bodyA;
        const bodyB = pairs[i].bodyB;

        if (bodyA.label.startsWith('fruit_') && bodyB.label.startsWith('fruit_')) {
            const indexA = parseInt(bodyA.label.split('_')[1]);
            const indexB = parseInt(bodyB.label.split('_')[1]);

            if (indexA === indexB && indexA < FRUITS.length - 1) {
                // Merge!
                const midX = (bodyA.position.x + bodyB.position.x) / 2;
                const midY = (bodyA.position.y + bodyB.position.y) / 2;

                World.remove(world, [bodyA, bodyB]);

                // Add score
                updateScore(FRUITS[indexA].score * 2);

                // Create new fruit
                const newFruit = createFruit(midX, midY, indexA + 1);
                World.add(world, newFruit);
            }
        }
    }
});

// Game Over Check - Simplified
// In a real Suika game, you check if a fruit stays above the line for X seconds.
// For now, we'll just check if a fruit is physically touching the top sensor substantially.
Events.on(engine, 'collisionActive', (event) => {
    if (isGameOver) return;

    const pairs = event.pairs;
    for (let i = 0; i < pairs.length; i++) {
        const bodyA = pairs[i].bodyA;
        const bodyB = pairs[i].bodyB;

        // If one is topSensor and other is a fruit that is NOT the currently dropping one
        // Note: This logic needs refinement to allow spawning. 
        // A common way is to check y-position of settled fruits.
    }
});

// Draw Limit Line
Events.on(render, 'afterRender', function () {
    const context = render.context;
    // Danger Zone Gradient or Line
    // Let's draw a nice glowing line
    context.beginPath();
    context.moveTo(0, 150);
    context.lineTo(450, 150);
    context.strokeStyle = "rgba(255, 118, 117, 0.5)"; // Soft red
    context.lineWidth = 4;
    context.setLineDash([10, 10]);
    context.stroke();

    // Add "DANGER" text small
    context.font = "12px 'Noto Sans KR'";
    context.fillStyle = "rgba(255, 118, 117, 0.8)";
    context.textAlign = "right";
    context.fillText("LIMIT", 440, 145);

    context.setLineDash([]);
    context.closePath();
});

// Game Over Check
setInterval(() => {
    if (isGameOver) return;

    const bodies = Composite.allBodies(world);
    let danger = false;

    for (const body of bodies) {
        if (body.label.startsWith('fruit_')) {
            // Check if fruit is settled and above the line
            // We give a little buffer (y < 140 instead of 150)
            if (body.position.y - body.circleRadius < 150 && body.speed < 0.2) {
                // To avoid triggering on just-spawned fruits, we can check 
                // if it's been in the world for a bit, or check if it is colliding with anything below it.
                // Simple heuristic: If it is this high and stopped, it's likely game over.
                // But we spawn at y=50. The spawned fruit is moving (falling).
                // So speed < 0.2 check should handle the falling fruit (which accelerates).
                // However, at the very peak of a bounce, speed might be low.
                // We'll add a timer or counter.
                danger = true;
            }
        }
    }

    if (danger) {
        if (!window.gameOverTimer) window.gameOverTimer = 0;
        window.gameOverTimer += 1000;
        if (window.gameOverTimer > 3000) { // 3 seconds over the line
            endGame();
        }
    } else {
        window.gameOverTimer = 0;
    }
}, 1000);

function updateScore(points) {
    score += points;
    scoreElement.innerText = score;
}

function endGame() {
    isGameOver = true;
    finalScoreElement.innerText = score;
    gameOverScreen.classList.remove("hidden");
}

restartBtn.addEventListener("click", initGame);

// Start
initGame();
