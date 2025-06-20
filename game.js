// ========================================
// Универсальный обработчик ошибок (поможет найти, где все падает)
// ========================================
window.onerror = function(message, source, lineno, colno, error) {
    console.error("--- Необработанная ошибка ---");
    console.error("Сообщение:", message);
    console.error("Источник:", source);
    console.error("Строка:", lineno);
    console.error("Столбец:", colno);
    console.error("Объект ошибки:", error);
    console.error("---------------------------");
    // Дополнительные действия при ошибке (например, показать сообщение пользователю)
    if (typeof gameOver === 'function') { // Проверяем, что функция gameOver определена
        // gameOver(); // Можно вызвать game over, но это может вызвать рекурсивные ошибки
    }
    // Возвращаем true, чтобы браузер не выводил ошибку в консоль дважды
    return true;
};


// ========================================
// ПОЛУЧЕНИЕ ЭЛЕМЕНТОВ CANVAS И UI
// ========================================
const canvas = document.getElementById('gameCanvas');
// Проверка, что canvas элемент найден. Если нет, логируем ошибку и не продолжаем.
if (!canvas) { console.error("Ошибка инициализации: Элемент Canvas с ID 'gameCanvas' не найден на странице!"); }
const ctx = canvas ? canvas.getContext('2d') : null; // Получаем 2D контекст для рисования

// Получаем элементы пользовательского интерфейса (UI) из HTML (убедись, что ID соответствуют!)
const scoreElement = document.getElementById('score'); // Элемент для отображения счета
const centerMessageContainer = document.getElementById('centerMessageContainer'); // Контейнер для центрирования сообщений/кнопки
const startMessageElement = document.getElementById('startMessage'); // Блок для стартового сообщения ("Нажмите ПРОБЕЛ...")
const gameOverMessageElement = document.getElementById('gameOverMessage'); // Блок для сообщения Game Over ("Игра окончена!")
const restartBtn = document.getElementById('restartBtn'); // Кнопка для старта/перезапуска ("Начать игру" / "Начать заново")
const soundToggleBtn = document.getElementById('soundToggle'); // Кнопка для переключения звука

// Получаем аудио элементы из HTML (Убедись, что ID здесь правильные и соответствуют HTML)
const jumpSound = document.getElementById('jumpSound'); // Звук прыжка
const gameOverSound = document.getElementById('gameOverSound'); // Звук окончания игры
const scoreSound = document.getElementById('scoreSound'); // Звук получения очков

// Проверки на существование всех важных элементов UI (для раннего предупреждения)
if (!scoreElement || !centerMessageContainer || !startMessageElement || !gameOverMessageElement || !restartBtn || !soundToggleBtn || !jumpSound || !gameOverSound || !scoreSound || !ctx) {
     console.error("Критическая ошибка инициализации: Не все необходимые HTML элементы с правильными ID найдены или Canvas/Context недоступен.");
     // Если это критично, можно добавить логику для полной остановки игры или показа сообщения об ошибке пользователю.
     // alert("Произошла ошибка загрузки игры. Пожалуйста, обновите страницу или проверьте файлы.");
}


// ========================================
// ГЛОБАЛЬНЫЕ НАСТРОЙКИ ИГРЫ (КОНФИГУРАЦИЯ)
// ========================================

// Настройки игрока
const PLAYER_CONFIG = {
    width: 60, height: 60, x: 100,
    groundYOffset: 5, // Смещение игрока вверх от линии земли
    jumpPower: 23,     // !!! СИЛА ПРЫЖКА - увеличена для прыжка дальше
    gravity: 0.6,      // Гравитация
    imageSrc: 'topu.png', // Убедись, что путь верен
    color: '#4CAF50'   // Запасной цвет
};

// Настройки препятствий
const OBSTACLE_CONFIG = {
    types: [
        { width: 25, height: 30 }, { width: 35, height: 40 },
        { width: 45, height: 50 }, { width: 35, height: 55 },
    ],
    speed: 2, minGap: 400, maxGap: 600,
    imageSrc: 'mushroom.png', // Убедись, что путь верен
    color: '#ff0000'
};

// Настройки земли
const GROUND_CONFIG = {
    relativeY: 0.7, // Y координата верхней линии земли (70% высоты Canvas)
    height: 100,       // Визуальная высота земли для рисования (ноfillRect будет идти до низа Canvas)
    color: '#404242'   // Цвет земли
};

// Настройки фона (небо и облака)
const BACKGROUND_CONFIG = {
    skyGradient: { start: '#74b9ff', end: '#a29bfe' },
    clouds: { enabled: true, color: 'rgba(255, 255, 255, 0.8)', speed: 0.4, spawnRate: 0.006 }
};

// Настройки ускорения игры
const SPEED_INCREASE_CONFIG = {
    rate: 0.0008, maxSpeed: 3 // Скорость ускоряется на эту величину каждый кадр
};

// Настройки а
let soundEnabled = true; // Звук включен по умолчанию

// ========================================
// ИГРОВЫЕ ПЕРЕМЕННЫЕ (СОСТОЯНИЕ ИГРЫ)
// ========================================

let gameRunning = false; // Флаг: запущена ли игра
let score = 0; // Текущий счет игрока
let gameSpeed = OBSTACLE_CONFIG.speed; // Текущая скорость движения мира (начинается с OBSTACLE_CONFIG.speed)
let frameCount = 0; // Счетчик кадров

const player = {
    x: PLAYER_CONFIG.x, y: 0, // Y будет рассчитана при инициализации
    width: PLAYER_CONFIG.width, height: PLAYER_CONFIG.height,
    velocityY: 0, grounded: true, jumping: false,
    image: null // Здесь будет объект Image
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

// checkAllImagesLoaded теперь вызывается из onload/onerror
// initializeGameCanvas будет вызван в конце window.onload после проверки флагов загрузки.

// Функция проверки, все ли необходимые изображения загружены
function checkAllImagesLoaded() {
    // Проверяем флаги загрузки обоих изображений.
    // Если imageSrc был null, соответствующий флаг сразу true.
    if (playerImageLoaded && obstacleImageLoaded) {
        console.log("Ресурсы: Все изображения загружены или отсутствуют. Инициализация Canvas готова.");
        // После загрузки картинок (или если их нет),
        // initializeGameCanvas будет вызвана в window.onload.
        // Это предотвращает запуск gameLoop до готовности DOM и Canvas.
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
         // Можно добавить alert или показать сообщение об ошибке пользователю, если элементы не найдены.
         return; // Не продолжаем, если нет необходимых элементов
    }

    // Устанавливаем размер canvas (можно сделать адаптивным)
    canvas.width = window.innerWidth * 0.8;
    canvas.height = window.innerHeight * 0.6;

    // Пересчитываем позицию земли и начальную позицию игрока
    GROUND_CONFIG.y = canvas.height * GROUND_CONFIG.relativeY;
    player.y = GROUND_CONFIG.y - PLAYER_CONFIG.height - PLAYER_CONFIG.groundYOffset;


    // --- Настраиваем UI для стартового экрана ---
    scoreElement.textContent = `Score: ${score}`; // Показываем начальный счет 0

    // Показываем/скрываем сообщения и кнопку на стартовом экране
    // Контейнер centerMessageContainer управляет отображением сообщений и кнопки "Начать игру" / "Начать заново"
    centerMessageContainer.style.display = 'flex'; // Используем flexbox для центрирования содержимого (кнопки и текста)
    centerMessageContainer.style.flexDirection = 'column'; // Располагаем элементы друг под другом
    centerMessageContainer.style.alignItems = 'center'; // Центрируем по горизонтали

    startMessageElement.style.display = 'block'; // Показываем стартовое сообщение
    startMessageElement.textContent = "Press SPACE or click to jump"; // Текст на стартовом экране
    gameOverMessageElement.style.display = 'none'; // Скрываем сообщение Game Over (оно не нужно на старте)

    restartBtn.style.display = 'inline-block'; // Показываем кнопку "Начать игру"
    restartBtn.textContent = "Start the game"; // Текст на кнопке старта


    // Создаем несколько начальных облаков
    if (BACKGROUND_CONFIG.clouds.enabled) {
         clouds = []; // Очищаем на всякий случай
         for (let i = 0; i < 5; i++) {
             createCloud();
             // Располагаем их по всему экрану в случайных позициях
             if (canvas) clouds[i].x = Math.random() * canvas.width;
         }
     }

    // ! Запускаем первый кадр отрисовки.
    // gameLoop нарисует стартовый экран. Дальше requestAnimationFrame продолжит вызывать gameLoop.
    // Игра начнется только когда gameRunning станет true (при вызове restartGame по первому действию пользователя).
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
    // Рисуем прямоугольник земли от GROUND_CONFIG.y ДО НИЖНЕГО КРАЯ CANVAS
    ctx.fillRect(0, GROUND_CONFIG.y, canvas.width, canvas.height - GROUND_CONFIG.y); // <-- ИСПРАВЛЕНО ЗДЕСЬ

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
     // console.log("Текущая скорость:", gameSpeed); // Можно раскомментировать для отладки скорости
}


// ========================================
// ГЛАВНЫЙ ИГРОВОЙ ЦИКЛ (ФУНКЦИЯ ОБНОВЛЕНИЯ/ОТРИСОВКИ КАЖДОГО КАДРА)
// ========================================

function gameLoop() {
    if (!ctx || !canvas) {
         console.error("Critical error: Canvas or 2D context is not available.");
         // Чтобы остановить requestAnimationFrame, если контекст потерян:
         // Нужно сохранить идентификатор, возвращаемый requestAnimationFrame, и вызвать cancelAnimationFrame.
         // Для простоты, мы просто выводим ошибку и возвращаемся.
         return;
    }

    // --- Очистка Canvas ---
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // --- Отрисовка фона и земли ---
    drawBackground(); // Небо с градиентом
    drawGround();     // Земля (до низа Canvas)
    drawClouds();     // Облака


    if (!gameRunning) {
        // Если игра НЕ запущена (стартовый экран или Game Over)
        // Отрисовываем только статический кадр: фон, земля, облака, игрок.
        // Логика игры (обновление позиций, скорости) НЕ ВЫПОЛНЯЕТСЯ.
        drawPlayer(); // Отрисовываем игрока на его стартовой позиции

        // UI (сообщения, кнопки) управляется через style.display.

        requestAnimationFrame(gameLoop); // Запрашиваем следующий кадр для поддержания отрисовки статического экрана
        return; // Выходим из функции gameLoop для этого кадра.
    }

    // --- Обновление состояния игры (выполняется только когда gameRunning == true) ---
    updateClouds(); // Облака двигаются
    updatePlayer(); // Игрок прыгает/падает
    updateObstacles(); // Препятствия движутся, генерируются, удаляются, счет обновляется
    increaseGameSpeed(); // Скорость увеличивается

    // --- Отрисовка игровых объектов ---
    drawPlayer(); // Отрисовываем игрока в его новой позиции
    obstacles.forEach(drawObstacle); // Отрисовываем все активные препятствия

    // --- Проверка условий окончания игры ---
    if (checkCollision()) {
        gameOver(); // Если обнаружено столкновение, вызываем функцию окончания игры
        // gameRunning становится false внутри gameOver().
        // В следующем кадре gameLoop() увидит, что gameRunning false, и перейдет в режим отрисовки game over.
        return; // Прерываем выполнение оставшейся части gameLoop для этого кадра.
    }

    // --- Запрос следующего кадра ---
    // Если игра еще НЕ окончена (мы не вышли из функции выше), запрашиваем следующий кадр.
    requestAnimationFrame(gameLoop);
}

// ========================================
// СОСТОЯНИЯ ИГРЫ (СТАРТ, РЕСТАРТ, GAME OVER)
// ========================================

// Функция для запуска или перезапуска игры.
// Сбрасывает все игровые переменные и переводит игру в состояние "запущено".
// Привязана к кнопке перезапуска и первому действию пользователя.
window.restartGame = function() {
    console.log("Starting/Restarting the game...");

    // --- Сбрасываем игровые переменные ---
    gameRunning = true; // !!! Устанавливаем флаг, что игра ЗАПУЩЕНА
    score = 0; // Сбрасываем счет
    if (scoreElement) scoreElement.textContent = `Score ${score}`; // Обновляем текст счета
    gameSpeed = OBSTACLE_CONFIG.speed; // Сбрасываем скорость к НАЧАЛЬНОЙ скорости из конфига
    obstacles = []; // Очищаем массив препятствий
    clouds = []; // Очищаем массив облаков (они будут созданы заново ниже)
    lastScoreSound = 0; // Сбрасываем счетчик последнего проигранного звука очков

    // --- Сбрасываем позицию и состояние игрока ---
    if (canvas) { // Проверяем, что canvas существует перед расчетом позиции
         // Пересчитываем Y на случай, если размер Canvas изменился
         player.y = GROUND_CONFIG.y - PLAYER_CONFIG.height - PLAYER_CONFIG.groundYOffset;
    }
    player.velocityY = 0; // Изначальная скорость игрока по вертикали
    player.grounded = true; // Игрок начинает на земле
    player.jumping = false; // Игрок не прыгает в начале

    // --- Скрываем UI сообщений во время игры ---
    // Контейнер centerMessageContainer скрывается, убирая сообщения и кнопку "Начать игру" / "Начать заново" с экрана игры.
    if (centerMessageContainer) centerMessageContainer.style.display = 'none';
    // Отдельные сообщения и кнопка тоже скрываются, хотя их уже скрывает контейнер.
    if (startMessageElement) startMessageElement.style.display = 'none';
    if (gameOverMessageElement) gameOverMessageElement.style.display = 'none';
    // Кнопка перезапуска также скрывается, хотя её уже скрывает контейнер.
    if (restartBtn) restartBtn.style.display = 'none';


    // Создаем несколько начальных облаков для фона
    if (BACKGROUND_CONFIG.clouds.enabled && canvas) { // Проверяем, что облака включены и canvas доступен
         for (let i = 0; i < 5; i++) {
             createCloud();
             // Располагаем их по всему экрану в случайных позициях
             clouds[i].x = Math.random() * canvas.width;
         }
     }

    // gameLoop уже запущен через requestAnimationFrame в конце window.onload.
    // Установка gameRunning = true в начале этой функции позволяет ему начать обновление логики игры в следующем кадре.
    console.log("Game restarted. Speed ​​reset to:", gameSpeed);

    // ! Не вызываем gameLoop() напрямую здесь, т.к. requestAnimationFrame уже управляет вызовами.
    // gameLoop просто продолжит выполнение с gameRunning = true в следующем кадре.
}

// Функция окончания игры.
// Вызывается при обнаружении столкновения.
function gameOver() {
    gameRunning = false; // !!! Устанавливаем флаг, что игра ОСТАНОВЛЕНА
    console.log("Game over. Final score:", score);

    // --- Показываем UI Game Over ---
    // Показываем контейнер сообщений/кнопки.
    if (centerMessageContainer) centerMessageContainer.style.display = 'flex';
    // Показываем сообщение "Игра окончена!", скрываем стартовое сообщение.
    if (gameOverMessageElement) {
        gameOverMessageElement.style.display = 'block';
        gameOverMessageElement.textContent = "Game Over!"; // Убедимся, что текст правильный
    }
     if (startMessageElement) startMessageElement.style.display = 'none'; // Скрываем стартовое сообщение

    // Показываем кнопку "Начать заново", убеждаемся в ее тексте.
    if (restartBtn) {
        restartBtn.style.display = 'inline-block';
        restartBtn.textContent = "Restart the game";
    }

    playSound(gameOverSound); // Проигрываем звук окончания игры

    // gameLoop продолжит вызываться через requestAnimationFrame, отрисовывая статический game over экран.
}


// ========================================
// ОБРАБОТЧИКИ СОБЫТИЙ (КЛАВИАТУРА, МЫШЬ, ТАЧ)
// ========================================

// Обработка нажатия клавиши ПРОБЕЛ
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault(); // Предотвращаем стандартное действие браузера
        handlePlayerAction(); // Вызываем универсальную функцию обработки действия игрока
    }
});

// Обработка клика мышью на canvas
if (canvas) { // Проверяем, что canvas существует перед добавлением слушателя
    canvas.addEventListener('click', () => {
         handlePlayerAction();
    });
}

// Обработка тача на canvas
if (canvas) { // Проверяем, что canvas существует перед добавлением слушателя
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault(); // Предотвращаем стандартное действие тача (например, масштабирование)
         handlePlayerAction();
    });
}

// Универсальная функция обработки действий пользователя (прыжок, клик, тач)
function handlePlayerAction() {
     // Если игра не запущена (мы на стартовом экране или после Game Over),
     // первое действие пользователя (пробел, клик, тач) запускает игру.
     // Иначе, если игра запущена, действие вызывает прыжок.
     if (!gameRunning) {
         restartGame(); // Вызываем функцию запуска/перезапуска игры
     } else {
          jump(); // Вызываем функцию прыжка
     }
}

// Обработка клика по кнопке перезапуска/старта
if (restartBtn) { // Проверяем, что кнопка существует перед добавлением слушателя
     restartBtn.addEventListener('click', () => {
         restartGame(); // Клик по кнопке всегда запускает игру заново
     });
}


// ========================================
// ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ СТРАНИЦЫ
// ========================================

// Этот код выполнится один раз после полной загрузки всего HTML контента и всех скриптов.
// Здесь мы настраиваем начальное состояние Canvas и UI, и запускаем первый кадр отрисовки (стартовый экран).
window.onload = () => {
    console.log("window.onload: The window and all main resources (HTML, JS) are loaded.");

    // Проверяем, что все ресурсы (изображения) загружены перед инициализацией Canvas.
    // checkAllImagesLoaded() вызывается при загрузке каждого изображения.
    // Если все флаги true, initializeGameCanvas() вызывается.
    // Если window.onload сработал раньше загрузки всех изображений, мы ждем их здесь.
    if (playerImageLoaded && obstacleImageLoaded) {
        initializeGameCanvas(); // Вызываем функцию инициализации Canvas и UI.
        console.log("window.onload: Canvas and UI initialization started.");
    } else {
         console.log("window.onload: Wait for images to load before initializing Canvas.");
         // Если изображения еще не загружены, checkAllImagesLoaded вызовет initializeGameCanvas
         // после их загрузки.
    }

    // ! ВАЖНО: gameLoop запущен внутри initializeGameCanvas с помощью requestAnimationFrame.
    // requestAnimationFrame(gameLoop) не вызывается здесь напрямую в window.onload.
};


function checkAllImagesLoaded() {
    if (playerImageLoaded && obstacleImageLoaded) {
        console.log("Resources: All images loaded or missing. Canvas initialization ready.");
        // Если DOM уже загружен, инициализируем сразу
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