// --- 基礎變數 ---
let count = 0, subCount = 0, isRunning = false, isPausing = false;
let lifetimeCount = 0;
let autoInterval = null, timerInterval = null;
let remainingSeconds = 3600;

// 音訊引擎
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = new AudioContext();
let muyuBuffer = null, qingBuffer = null;

const statusText = document.getElementById('status-text');
const timerClock = document.getElementById('timer-clock');
const counterDisplay = document.getElementById('counter');
const startBtn = document.getElementById('start-btn');
const muyuBtn = document.getElementById('muyu-btn');
const overlay = document.getElementById('force-start-overlay');
const modeSelect = document.getElementById('mode-select');

// 背景播放維持
const silentAudio = new Audio();
silentAudio.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YQAAAAA=";
silentAudio.loop = true;

// 1. 初始化資源
async function handleEntry() {
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    overlay.style.display = 'none';
    statusText.innerText = "正在召喚資源...";
    loadResources();
}
overlay.addEventListener('click', handleEntry);

async function loadResources() {
    try {
        const [mAB, qAB] = await Promise.all([
            fetch('muyu.mp3').then(r => r.arrayBuffer()),
            fetch('bells.mp3').then(r => r.arrayBuffer())
        ]);
        muyuBuffer = await audioCtx.decodeAudioData(mAB);
        qingBuffer = await audioCtx.decodeAudioData(qAB);
        startBtn.disabled = false;
        startBtn.innerText = "開始修行";
        statusText.innerText = "道場就緒";
    } catch (e) { statusText.innerText = "載入失敗"; }
}

function play(buffer) {
    if (!buffer || !audioCtx) return;
    const s = audioCtx.createBufferSource();
    s.buffer = buffer; s.connect(audioCtx.destination);
    s.start(0);
}

// 🌟 計數邏輯核心
function handleCount() {
    const mode = modeSelect.value;
    play(muyuBuffer);

    if (mode === 'recitation') {
        subCount++;
        if (subCount >= 5) { subCount = 0; count++; return true; }
    } else {
        count++; return true;
    }
    return false;
}

// 🌟 自動循環
async function loop() {
    if (!isRunning || isPausing) return;
    
    const didStep = handleCount();
    if (didStep) {
        counterDisplay.innerText = `本次進度：${count}`;
        saveData();

        // 🌟 模式判斷：只有標準模式滿百鳴磬
        if (modeSelect.value === 'standard' && count % 100 === 0) {
            isPausing = true;
            clearInterval(autoInterval);
            statusText.innerText = `已滿 ${count} 下，鳴磬提醒...`;
            play(qingBuffer);
            setTimeout(() => {
                if (isRunning) {
                    isPausing = false;
                    statusText.innerText = "修行進行中...";
                    autoInterval = setInterval(loop, 60000 / parseInt(document.getElementById('speed-input').value));
                }
            }, 1500);
        }
    }
}

// 2. 計時模組
function startCountdown() {
    remainingSeconds = 3600;
    timerInterval = setInterval(() => {
        remainingSeconds--;
        const m = Math.floor(remainingSeconds / 60).toString().padStart(2, '0');
        const s = (remainingSeconds % 60).toString().padStart(2, '0');
        timerClock.innerText = `${m}:${s}`;
        if (remainingSeconds <= 0) finish();
    }, 1000);
}

// 3. 修行控制
startBtn.onclick = async () => {
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    count = 0; subCount = 0; isRunning = true;
    startBtn.disabled = true;
    counterDisplay.innerText = "本次進度：0";
    statusText.innerText = "鳴磬三聲，請靜心...";
    
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({ title: '一小時精進修行', artist: '隨身道場' });
        silentAudio.play().catch(()=>{});
    }

    for (let i = 0; i < 3; i++) {
        play(qingBuffer);
        await new Promise(r => setTimeout(r, 1500));
    }

    if (isRunning) {
        startCountdown();
        statusText.innerText = "一小時精進中...";
        autoInterval = setInterval(loop, 60000 / parseInt(document.getElementById('speed-input').value));
    }
};

async function finish() {
    isRunning = false; clearInterval(autoInterval); clearInterval(timerInterval);
    silentAudio.pause();
    statusText.innerText = "一小時圓滿，迴向中...";
    for (let i = 0; i < 3; i++) {
        play(qingBuffer);
        await new Promise(r => setTimeout(r, 1500));
    }
    startBtn.disabled = false;
    statusText.innerText = "修行圓滿！共計進度：" + count;
}

document.getElementById('stop-btn').onclick = () => {
    isRunning = false; clearInterval(autoInterval); clearInterval(timerInterval);
    silentAudio.pause(); startBtn.disabled = false;
    statusText.innerText = "修行已手動停止";
};

// 手動敲擊
muyuBtn.onclick = () => {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const didStep = handleCount();
    if (didStep) {
        counterDisplay.innerText = `本次進度：${count}`;
        saveData();
        // 🌟 手動同樣遵循：只有標準模式滿百鳴磬
        if (modeSelect.value === 'standard' && count % 100 === 0) play(qingBuffer);
    }
    const ft = document.getElementById('floating-text');
    ft.classList.remove('animate-text'); void ft.offsetWidth; ft.classList.add('animate-text');
};

function saveData() {
    lifetimeCount++;
    localStorage.setItem('kowtow_total', lifetimeCount);
    document.getElementById('lifetime-counter').innerText = `累計進度：${lifetimeCount.toLocaleString()}`;
}

window.onload = () => {
    lifetimeCount = parseInt(localStorage.getItem('kowtow_total')) || 0;
    document.getElementById('lifetime-counter').innerText = `累計進度：${lifetimeCount.toLocaleString()}`;
    const streak = localStorage.getItem('kowtow_streak') || 0;
    document.getElementById('streak-counter').innerText = `連續修行：${streak} 天`;
};

document.getElementById('reset-btn').onclick = () => { if(confirm("確定清除紀錄？")){localStorage.clear(); location.reload();} };
