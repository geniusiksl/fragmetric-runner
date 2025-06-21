
window.onerror = function(message, source, lineno, colno, error) {
    console.error("--- Необработанная ошибка ---");
    console.error("Сообщение:", message);
    console.error("Источник:", source);
    console.error("Строка:", lineno);
    console.error("Столбец:", colno);
    console.error("Объект ошибки:", error);
    console.error("---------------------------");
   
    if (typeof gameOver === 'function') { 
        // gameOver(); 
    }
    
    return true;
};


// ========================================
// ПОЛУЧЕНИЕ ЭЛЕМЕНТОВ CANVAS И UI
// ========================================
const canvas = document.getElementById('gameCanvas');

if (!canvas) { console.error("Ошибка инициализации: Элемент Canvas с ID 'gameCanvas' не найден на странице!"); }
const ctx = canvas ? canvas.getContext('2d') : null; 

// Получаем элементы пользовательского интерфейса (UI) из HTML 
const scoreElement = document.getElementById('score'); 
const centerMessageContainer = document.getElementById('centerMessageContainer'); 
const startMessageElement = document.getElementById('startMessage'); 
const gameOverMessageElement = document.getElementById('gameOverMessage'); 
const restartBtn = document.getElementById('restartBtn'); 
const soundToggleBtn = document.getElementById('soundToggle'); 

// Получаем аудио элементы из HTML (Убедись, что ID здесь правильные и соответствуют HTML)
const jumpSound = document.getElementById('jumpSound'); 
const gameOverSound = document.getElementById('gameOverSound'); 
const scoreSound = document.getElementById('scoreSound'); 

// Проверки на существование всех важных элементов UI (для раннего предупреждения)
if (!scoreElement || !centerMessageContainer || !startMessageElement || !gameOverMessageElement || !restartBtn || !soundToggleBtn || !jumpSound || !gameOverSound || !scoreSound || !ctx) {
     console.error("Критическая ошибка инициализации: Не все необходимые HTML элементы с правильными ID найдены или Canvas/Context недоступен.");
     
     // alert("Произошла ошибка загрузки игры. Пожалуйста, обновите страницу или проверьте файлы.");
}


// ========================================
// ГЛОБАЛЬНЫЕ НАСТРОЙКИ ИГРЫ (КОНФИГУРАЦИЯ)
// ========================================

// Настройки игрока
const PLAYER_CONFIG = {
    width: 60, height: 60, x: 100,
    groundYOffset: 5, 
    jumpPower: 17.5,     
    gravity: 0.6,      
    imageSrc: 'topu.png', 
    color: '#4CAF50'   
};

// Настройки препятствий
const OBSTACLE_CONFIG = {
    types: [
        { width: 25, height: 30 }, { width: 35, height: 40 },
        { width: 45, height: 50 }, { width: 35, height: 55 },
    ],
    speed: 2, minGap: 400, maxGap: 600,
    imageSrc: 'mushroom.png', 
    color: '#ff0000'
};

// Настройки земли
const GROUND_CONFIG = {
    relativeY: 0.7, 
    height: 100,       
    color: '#404242'   
};

// Настройки фона (небо и облака)
const BACKGROUND_CONFIG = {
    skyGradient: { start: '#74b9ff', end: '#a29bfe' },
    clouds: { enabled: true, color: 'rgba(255, 255, 255, 0.8)', speed: 0.4, spawnRate: 0.006 }
};

// Настройки ускорения игры
const SPEED_INCREASE_CONFIG = {
    rate: 0.0008, 
    maxSpeed: 10,
    increaseInterval: 10  
};
let nextSpeedIncrease = SPEED_INCREASE_CONFIG.increaseInterval;

function updateObstacles(deltaTime) {
    if (!canvas) return;
    const modifier = deltaTime / 16.66;

    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].x -= gameSpeed * modifier;

        if (obstacles[i].x + obstacles[i].width < 0) {
            obstacles.splice(i, 1);
            score++;
            if (scoreElement) scoreElement.textContent = `Score: ${score}`;

            // Увеличиваем скорость каждые SPEED_INCREASE_CONFIG.increaseInterval очков
            if (score >= nextSpeedIncrease) {
                increaseGameSpeed();
                nextSpeedIncrease += SPEED_INCREASE_CONFIG.increaseInterval;
            }

            if (score > 0 && score % 10 === 0) {
                if (score > lastScoreSound) {
                    playSound(scoreSound);
                    lastScoreSound = score;
                }
            }
        }
    }

    if (obstacles.length === 0 ||
        obstacles[obstacles.length - 1].x < canvas.width - OBSTACLE_CONFIG.minGap -
        Math.random() * (OBSTACLE_CONFIG.maxGap - OBSTACLE_CONFIG.minGap)) {
        createObstacle();
    }
}
function increaseGameSpeed() {
  gameSpeed += SPEED_INCREASE_CONFIG.rate;

  if (gameSpeed > SPEED_INCREASE_CONFIG.maxSpeed) {
    gameSpeed = SPEED_INCREASE_CONFIG.maxSpeed;
  }
}


let soundEnabled = true; // Звук включен по умолчанию

// ========================================
// ИГРОВЫЕ ПЕРЕМЕННЫЕ (СОСТОЯНИЕ ИГРЫ)
// ========================================

let gameRunning = false; 
let score = 0; 
let gameSpeed = OBSTACLE_CONFIG.speed; 
let frameCount = 0; // Счетчик кадров

const player = {
    x: PLAYER_CONFIG.x, y: 0, 
    width: PLAYER_CONFIG.width, height: PLAYER_CONFIG.height,
    velocityY: 0, grounded: true, jumping: false,
    image: null 
};

let obstacles = [];
let clouds = [];

// Глобальные переменные для загруженных изображений
let loadedPlayerImg = null;
let loadedObstacleImg = null;

// Глобальные флаги состояния загрузки изображений
let playerImageLoaded = false;
let obstacleImageLoaded = false;

let lastScoreSound = 0;


// ========================================
// ЗАГРУЗКА РЕСУРСОВ (ИЗОБРАЖЕНИЙ И ЗВУКОВ)
// ========================================

// Функция для загрузки изображения
function loadImage(src, onSuccess, onError) {
    if (!src) { onSuccess(null); return null; }
    const img = new Image();
    img.onload = () => onSuccess(img);
    img.onerror = () => { console.error(`Ошибка загрузки изображения: ${src}`); onError(null); };
    img.src = src;
    return img;
}

// Запускаем загрузку изображений
loadedPlayerImg = loadImage(PLAYER_CONFIG.imageSrc,
    (img) => { player.image = img; playerImageLoaded = true; checkAllImagesLoaded(); },
    (e) => { playerImageLoaded = true; checkAllImagesLoaded(); }
);

loadedObstacleImg = loadImage(OBSTACLE_CONFIG.imageSrc,
    (img) => { loadedObstacleImg = img; obstacleImageLoaded = true; checkAllImagesLoaded(); },
    (e) => { obstacleImageLoaded = true; checkAllImagesLoaded(); }
);



// Функция проверки, все ли необходимые изображения загружены
function checkAllImagesLoaded() {
    
    if (playerImageLoaded && obstacleImageLoaded) {
        console.log("Ресурсы: Все изображения загружены или отсутствуют. Инициализация Canvas готова.");
        
    } else {
        console.log("Ресурсы: Ожидаем загрузки изображений...");
    }
}

// ========================================
// НАСТРОЙКА CANVAS И UI (ПОСЛЕ ЗАГРУЗКИ ДОМ И РЕСУРСОВ)
// ========================================

function initializeGameCanvas() {
    console.log("Инициализация: Настройка Canvas и UI...");
    // Проверка наличия всех необходимых элементов перед началом
    if (!canvas || !ctx || !scoreElement || !centerMessageContainer || !startMessageElement || !gameOverMessageElement || !restartBtn || !soundToggleBtn || !jumpSound || !gameOverSound || !scoreSound) {
         console.error("Критическая ошибка инициализации: Не все необходимые HTML элементы или Canvas/Context доступны.");
         
         return; 
    }

    // Устанавливаем размер canvas 
    canvas.width = window.innerWidth * 0.8;
    canvas.height = window.innerHeight * 0.6;

    // Пересчитываем позицию земли и начальную позицию игрока
    GROUND_CONFIG.y = canvas.height * GROUND_CONFIG.relativeY;
    player.y = GROUND_CONFIG.y - PLAYER_CONFIG.height - PLAYER_CONFIG.groundYOffset;


    // --- Настраиваем UI для стартового экрана ---
    scoreElement.textContent = `Score: ${score}`; 

    
    centerMessageContainer.style.display = 'flex'; 
    centerMessageContainer.style.flexDirection = 'column'; 
    centerMessageContainer.style.alignItems = 'center'; 

    startMessageElement.style.display = 'block'; 
    startMessageElement.textContent = "Press SPACE or click to jump"; 
    gameOverMessageElement.style.display = 'none'; 

    restartBtn.style.display = 'inline-block'; 
    restartBtn.textContent = "Start the game"; 


    // Создаем несколько начальных облаков
    if (BACKGROUND_CONFIG.clouds.enabled) {
         clouds = []; 
         for (let i = 0; i < 5; i++) {
             createCloud();
             
             if (canvas) clouds[i].x = Math.random() * canvas.width;
         }
     }

    
    console.log("Initialization: Canvas and UI are set up. Starting the first rendering frame (start screen).");
    requestAnimationFrame(gameLoop);
}


// ========================================
// ФУНКЦИИ ДЛЯ ОВ
// ========================================

function playSound(sound) {
    if (soundEnabled && sound) {
        try {
            const soundClone = sound.cloneNode();
            soundClone.currentTime = 0;
            soundClone.volume = 0.5;
            soundClone.play().catch(e => {
                 // console.log('Воспроизведение звука заблокировано браузером (требуется взаимодействие пользователя)');
            });
        } catch (e) {
            console.error('Error playing sound:', e);
        }
    }
}

window.toggleSound = function() {
    soundEnabled = !soundEnabled;
    if (soundToggleBtn) soundToggleBtn.textContent = soundEnabled ? '🔊 Sound: ON' : '🔇 Sound: OFF';
    console.log(`Sound ${soundEnabled ? 'on' : 'off'}`);
}

// ========================================
// ФУНКЦИИ ДЛЯ ФОНА (НЕБО, ЗЕМЛЯ, ОБЛАКА)
// ========================================

function drawBackground() {
    if (!ctx || !canvas) return;
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, BACKGROUND_CONFIG.skyGradient.start);
    gradient.addColorStop(1, BACKGROUND_CONFIG.skyGradient.end);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawGround() {
    if (!ctx || !canvas) return;
    ctx.fillStyle = GROUND_CONFIG.color;
   
    ctx.fillRect(0, GROUND_CONFIG.y, canvas.width, canvas.height - GROUND_CONFIG.y); 

    // Добавляем визуальную линию на верхней границе земли
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_CONFIG.y);
    ctx.lineTo(canvas.width, GROUND_CONFIG.y);
    ctx.stroke();
}

function createCloud() {
    if (!canvas) return;
    const cloud = {
        x: canvas.width + Math.random() * 300,
        y: Math.random() * (GROUND_CONFIG.y / 2) + 20,
        width: Math.random() * 80 + 70,
        height: Math.random() * 30 + 25,
        speed: Math.random() * BACKGROUND_CONFIG.clouds.speed + (BACKGROUND_CONFIG.clouds.speed / 2)
    };
    clouds.push(cloud);
}

function updateClouds() {
    if (!BACKGROUND_CONFIG.clouds.enabled || !canvas) return;

    for (let i = clouds.length - 1; i >= 0; i--) {
        clouds[i].x -= clouds[i].speed;

        if (clouds[i].x + clouds[i].width < 0) {
            clouds.splice(i, 1);
        }
    }

    if (Math.random() < BACKGROUND_CONFIG.clouds.spawnRate) {
         if (clouds.length < 8) {
             createCloud();
         }
    }
}

function drawCloud(cloud) {
     if (!ctx) return;
    ctx.fillStyle = BACKGROUND_CONFIG.clouds.color;
    ctx.beginPath();
    ctx.arc(cloud.x, cloud.y, cloud.height * 0.6, 0, Math.PI * 2);
    ctx.arc(cloud.x + cloud.width * 0.3, cloud.y - cloud.height * 0.3, cloud.height * 0.7, 0, Math.PI * 2);
    ctx.arc(cloud.x + cloud.width * 0.6, cloud.y, cloud.height * 0.8, 0, Math.PI * 2);
    ctx.arc(cloud.x + cloud.width * 0.8, cloud.y - cloud.height * 0.4, cloud.height * 0.5, 0, Math.PI * 2);
    ctx.fill();
}

function drawClouds() {
    if (BACKGROUND_CONFIG.clouds.enabled && ctx) {
        clouds.forEach(drawCloud);
    }
}


// ========================================
// ФУНКЦИИ ИГРОКА
// ========================================

function drawPlayer() {
    if (!ctx) return;
    ctx.save();

    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;

    // Используем глобальную переменную loadedPlayerImg, которая содержит объект Image, если загрузка успешна
    if (loadedPlayerImg) {
        ctx.drawImage(loadedPlayerImg, player.x, player.y, player.width, player.height);
    } else { // Если изображение не загружено (loadedPlayerImg = null)
        ctx.fillStyle = PLAYER_CONFIG.color;
        ctx.fillRect(player.x, player.y, player.width, player.height);
    }

    ctx.restore();
}

function updatePlayer() {
    if (!canvas) return;
    if (!player.grounded) {
        player.velocityY += PLAYER_CONFIG.gravity;
    }

    player.y += player.velocityY;

    const groundContactY = GROUND_CONFIG.y - PLAYER_CONFIG.groundYOffset;
    if (player.y + player.height >= groundContactY) {
        player.y = groundContactY - player.height;
        player.velocityY = 0;
        player.grounded = true;
        player.jumping = false;
    }
}

function jump() {
    if (gameRunning && player.grounded && !player.jumping) {
        player.velocityY = -PLAYER_CONFIG.jumpPower;
        player.grounded = false;
        player.jumping = true;
        playSound(jumpSound);
    }
}

// ========================================
// ФУНКЦИИ ПРЕПЯТСТВИЙ
// ========================================

function createObstacle() {
    if (!canvas) return;
    const type = OBSTACLE_CONFIG.types[Math.floor(Math.random() * OBSTACLE_CONFIG.types.length)];

    const obstacle = {
        x: canvas.width,
        // Препятствие стоит на земле: Y = Y линии земли - высота препятствия
        y: GROUND_CONFIG.y - type.height,
        width: type.width,
        height: type.height
    };
    obstacles.push(obstacle);
}

function updateObstacles() {
    if (!canvas) return;
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].x -= gameSpeed;

        if (obstacles[i].x + obstacles[i].width < 0) {
            obstacles.splice(i, 1);
            score++;
            if (scoreElement) scoreElement.textContent = `Score: ${score}`;

            if (score > 0 && score % 10 === 0) {
                 if (score > lastScoreSound) {
                      playSound(scoreSound);
                      lastScoreSound = score;
                 }
            }
        }
    }

    if (obstacles.length === 0 ||
        obstacles[obstacles.length - 1].x < canvas.width - OBSTACLE_CONFIG.minGap -
        Math.random() * (OBSTACLE_CONFIG.maxGap - OBSTACLE_CONFIG.minGap)) {
        createObstacle();
    }
}

function drawObstacle(obstacle) {
    if (!ctx) return;
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;

    // Используем глобальную переменную loadedObstacleImg, которая содержит объект Image
    if (loadedObstacleImg) {
        ctx.drawImage(loadedObstacleImg, obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    } else { // Если изображение не загружено
        ctx.fillStyle = OBSTACLE_CONFIG.color;
         ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    }

    ctx.restore();
}


// ========================================
// ПРОВЕРКА СТОЛКНОВЕНИЙ
// ========================================

function checkCollision() {
    for (let obstacle of obstacles) {
        if (player.x < obstacle.x + obstacle.width &&
            player.x + player.width > obstacle.x &&
            player.y < obstacle.y + obstacle.height &&
            player.y + player.height > obstacle.y) {
            return true;
        }
    }
    return false;
}

// ========================================
// УСКОРЕНИЕ ИГРЫ
// ========================================

function increaseGameSpeed() {
    gameSpeed += SPEED_INCREASE_CONFIG.rate;

    if (gameSpeed > SPEED_INCREASE_CONFIG.maxSpeed) {
        gameSpeed = SPEED_INCREASE_CONFIG.maxSpeed;
    }
     // console.log("Текущая скорость:", gameSpeed); 
}


// ========================================
// ГЛАВНЫЙ ИГРОВОЙ ЦИКЛ (ФУНКЦИЯ ОБНОВЛЕНИЯ/ОТРИСОВКИ КАЖДОГО КАДРА)
// ========================================

function gameLoop() {
    if (!ctx || !canvas) {
         console.error("Critical error: Canvas or 2D context is not available.");
         
         return;
    }

    // --- Очистка Canvas ---
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // --- Отрисовка фона и земли ---
    drawBackground(); 
    drawGround();     
    drawClouds();     


    if (!gameRunning) {
        
        drawPlayer(); 

        // UI (сообщения, кнопки) управляется через style.display.

        requestAnimationFrame(gameLoop); 
        return; 
    }

    // --- Обновление состояния игры (выполняется только когда gameRunning == true) ---
    updateClouds(); 
    updatePlayer(); 
    updateObstacles(); 
    increaseGameSpeed(); 

    // --- Отрисовка игровых объектов ---
    drawPlayer(); 
    obstacles.forEach(drawObstacle); 

    // --- Проверка условий окончания игры ---
    if (checkCollision()) {
        gameOver(); 
        // gameRunning становится false внутри gameOver().
        // В следующем кадре gameLoop() увидит, что gameRunning false, и перейдет в режим отрисовки game over.
        return; 
    }

    // --- Запрос следующего кадра ---
    
    requestAnimationFrame(gameLoop);
}

// ========================================
// СОСТОЯНИЯ ИГРЫ (СТАРТ, РЕСТАРТ, GAME OVER)
// ========================================


window.restartGame = function() {
    console.log("Starting/Restarting the game...");

    // --- Сбрасываем игровые переменные ---
    gameRunning = true; 
    score = 0; // Сбрасываем счет
    if (scoreElement) scoreElement.textContent = `Score ${score}`; 
    gameSpeed = OBSTACLE_CONFIG.speed; 
    obstacles = []; 
    clouds = []; 
    lastScoreSound = 0; 

    // --- Сбрасываем позицию и состояние игрока ---
    if (canvas) { 
         
         player.y = GROUND_CONFIG.y - PLAYER_CONFIG.height - PLAYER_CONFIG.groundYOffset;
    }
    player.velocityY = 0; 
    player.grounded = true; 
    player.jumping = false; 

    // --- Скрываем UI сообщений во время игры ---
    
    if (centerMessageContainer) centerMessageContainer.style.display = 'none';
    
    if (startMessageElement) startMessageElement.style.display = 'none';
    if (gameOverMessageElement) gameOverMessageElement.style.display = 'none';
    
    if (restartBtn) restartBtn.style.display = 'none';


    // Создаем несколько начальных облаков для фона
    if (BACKGROUND_CONFIG.clouds.enabled && canvas) { 
         for (let i = 0; i < 5; i++) {
             createCloud();
             
             clouds[i].x = Math.random() * canvas.width;
         }
     }

    
    console.log("Game restarted. Speed ​​reset to:", gameSpeed);

   
}


function gameOver() {
    gameRunning = false;
    console.log("Game over. Final score:", score);

    // --- Показываем UI Game Over ---
    
    if (centerMessageContainer) centerMessageContainer.style.display = 'flex';
    
    if (gameOverMessageElement) {
        gameOverMessageElement.style.display = 'block';
        gameOverMessageElement.textContent = "Game Over!"; 
    }
     if (startMessageElement) startMessageElement.style.display = 'none'; 

    
    if (restartBtn) {
        restartBtn.style.display = 'inline-block';
        restartBtn.textContent = "Restart the game";
    }

    playSound(gameOverSound); // Проигрываем звук окончания игры

    
}


// ========================================
// ОБРАБОТЧИКИ СОБЫТИЙ (КЛАВИАТУРА, МЫШЬ, ТАЧ)
// ========================================

// Обработка нажатия клавиши ПРОБЕЛ
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault(); 
        handlePlayerAction(); 
    }
});

// Обработка клика мышью на canvas
if (canvas) { 
    canvas.addEventListener('click', () => {
         handlePlayerAction();
    });
}

// Обработка тача на canvas
if (canvas) { 
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault(); 
         handlePlayerAction();
    });
}

// Универсальная функция обработки действий пользователя (прыжок, клик, тач)
function handlePlayerAction() {
    
     if (!gameRunning) {
         restartGame(); 
     } else {
          jump(); 
     }
}

// Обработка клика по кнопке перезапуска/старта
if (restartBtn) { 
     restartBtn.addEventListener('click', () => {
         restartGame(); 
     });
}


// ========================================
// ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ СТРАНИЦЫ
// ========================================


window.onload = () => {
    console.log("window.onload: The window and all main resources (HTML, JS) are loaded.");

    
    if (playerImageLoaded && obstacleImageLoaded) {
        initializeGameCanvas(); 
        console.log("window.onload: Canvas and UI initialization started.");
    } else {
         console.log("window.onload: Wait for images to load before initializing Canvas.");
         
    }

};


function checkAllImagesLoaded() {
    if (playerImageLoaded && obstacleImageLoaded) {
        console.log("Resources: All images loaded or missing. Canvas initialization ready.");
        
        if (document.readyState === 'complete') {
            initializeGameCanvas();
        }
    } else {
        console.log("Resources: Waiting for images to load...");
    }
}

// ========================================
// ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ СТРАНИЦЫ
// ========================================

window.onload = () => {
    console.log("window.onload: The window and all main resources (HTML, JS) are loaded.");
    
    
    if (playerImageLoaded && obstacleImageLoaded) {
        initializeGameCanvas();
        console.log("window.onload: Canvas and UI initialization started.");
    } else {
        console.log("window.onload: Wait for images to load before initializing Canvas.");
       
        const checkInterval = setInterval(() => {
            if (playerImageLoaded && obstacleImageLoaded) {
                clearInterval(checkInterval);
                initializeGameCanvas();
            }
        }, 100);
    }
};
window.restartGame = function() {
    console.log("Restarting the game...");

  
    gameRunning = true;
    score = 0;
    gameSpeed = OBSTACLE_CONFIG.speed;
    frameCount = 0;
    lastScoreSound = 0;

    // Сброс позиции игрока
    if (canvas && player) {
        GROUND_CONFIG.y = canvas.height * GROUND_CONFIG.relativeY;
        player.x = PLAYER_CONFIG.x;
        player.y = GROUND_CONFIG.y - PLAYER_CONFIG.height - PLAYER_CONFIG.groundYOffset;
        player.velocityY = 0;
        player.grounded = true;
        player.jumping = false;
    }

    // Очистка игровых объектов
    obstacles = [];
    clouds = [];

    // Сброс UI
    if (scoreElement) scoreElement.textContent = `Score: ${score}`;
    if (centerMessageContainer) centerMessageContainer.style.display = 'none';
    if (gameOverMessageElement) gameOverMessageElement.style.display = 'none';
    if (restartBtn) restartBtn.style.display = 'none';

    // Пересоздание начального состояния облаков
    if (BACKGROUND_CONFIG.clouds.enabled && canvas) {
        clouds = [];
        for (let i = 0; i < 5; i++) {
            createCloud();
            clouds[i].x = Math.random() * canvas.width;
        }
    }

    // Принудительная перерисовка
    cancelAnimationFrame(gameLoop); // Остановка текущего цикла
    requestAnimationFrame(gameLoop); // Запуск нового цикла
};
