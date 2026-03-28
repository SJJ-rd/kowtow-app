// --- 基礎變數 ---
let count = 0, subCount = 0, isRunning = false, isPausing = false;
let lifetimeCount = 0;
let autoInterval = null, timerInterval = null;
let secondsRemaining = 0, secondsElapsed = 0;

// Web Audio 引擎
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = new AudioContext();
let muyuBuffer = null, qingBuffer = null;

const statusText = document.getElementById('status-text'),
      timerClock = document.getElementById('timer-clock'),
      timerLabel = document.getElementById('timer-label'),
      counterDisplay = document.getElementById('counter'),
      startBtn = document.getElementById('start-btn'),
      muyuBtn = document.getElementById('muyu-btn'),
      overlay = document.getElementById('force-start-overlay'),
      modeSelect = document.getElementById('mode-select'),
      goalTypeSelect = document.getElementById('goal-type');

// 目標類型切換
goalTypeSelect.addEventListener('change', function() {
    const isTimeMode = this.value === 'time';
    document.getElementById('goal-time-input').style.display = isTimeMode ? 'block' : 'none';
    document.getElementById('goal-count-input').style.display = isTimeMode ? 'none' : 'block';
    timerLabel.innerText = isTimeMode ? "修行倒數" : "已修持時間";
    timerClock.innerText = isTimeMode ? document.getElementById('target-time').value + ":00" : "00:00";
});

// 背景播放維持
const silentAudio = new Audio();
silentAudio.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YQAAAAA=";
silentAudio.loop = true;

// 1. 初始化資源 (加入版本號確保更新)
async function handleEntry() {
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    overlay.style.display = 'none';
    statusText.innerText = "正在接引資源...";
    
    try {
        const ver = Date.now(); 
        const [mAB, qAB] = await Promise.all([
            fetch(`muyu.mp3?v=${ver}`).then(r => r.arrayBuffer()),
            fetch(`bells.mp3?v=${ver}`).then(r => r.arrayBuffer())
        ]);
        muyuBuffer = await audioCtx.decodeAudioData(mAB);
        qingBuffer = await audioCtx.decodeAudioData(qAB);
        startBtn.disabled = false;
        startBtn.innerText = "開始修行";
        statusText.innerText = "道場就緒";
    } catch (e) { 
        statusText.innerText = "載入失敗，請確認檔案"; 
    }
}
overlay.addEventListener('click', handleEntry);

function play(buffer, vol = 1.0) {
    if (!buffer || !audioCtx) return;
    const source = audioCtx.createBufferSource();
    const gainNode = audioCtx.createGain();
    source.buffer = buffer; 
    gainNode.gain.value = vol;
    source.connect(gainNode); 
    gainNode.connect(audioCtx.destination);
    source.start(0);
}

// 🌟 核心修正：自動計算長度，並在「尾音剩 0.1 秒」時銜接下一聲
function playWait(buffer) {
    return new Promise(resolve => {
        play(buffer);
        // buffer.duration 是音檔的總秒數
        // 我們將等待時間設為 (總長度 - 0.1秒)
        const delay = (buffer.duration > 0.1) ? (buffer.duration - 0.1) * 1000 : 100;
        setTimeout(resolve, delay);
    });
}

// 計數處理
function handleCount() {
    play(muyuBuffer);
    if (modeSelect.value === 'recitation') {
        subCount++;
        if (subCount >= 5) { subCount = 0; count++; return true; }
    } else {
        count++; return true;
    }
    return false;
}

// 自動循環邏輯
async function loop() {
    if (!isRunning || isPausing) return;
    const didStep = handleCount();
    if (didStep) {
        counterDisplay.innerText = `本次進度：${count}`;
        saveData();
        
        if (goalTypeSelect.value === 'count') {
            const targetCount = parseInt(document.getElementById('target-count').value);
            if (count >= targetCount) { finish(); return; }
        }

        // 標準模式滿百鳴磬
        if (modeSelect.value === 'standard' && count % 100 === 0) {
            isPausing = true; 
            clearInterval(autoInterval);
            statusText.innerText = `已滿 ${count} 下，鳴磬提醒...`;
            play(qingBuffer);
            // 滿百鳴磬後暫停 1.5 秒再繼續敲木魚
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

// 計時器
function startTimer() {
    secondsElapsed = 0;
    secondsRemaining = parseInt(document.getElementById('target-time').value) * 60;
    timerInterval = setInterval(() => {
        if (!isRunning) return;
        if (goalTypeSelect.value === 'time') {
            secondsRemaining--;
            const m = Math.floor(secondsRemaining / 60).toString().padStart(2, '0');
            const s = (secondsRemaining % 60).toString().padStart(2, '0');
            timerClock.innerText = `${m}:${s}`;
            if (secondsRemaining <= 0) finish();
        } else {
            secondsElapsed++;
            const m = Math.floor(secondsElapsed / 60).toString().padStart(2, '0');
            const s = (secondsElapsed % 60).toString().padStart(2, '0');
            timerClock.innerText = `${m}:${s}`;
        }
    }, 1000);
}

// 開始：鳴磬三聲 (尾音銜接版)
startBtn.onclick = async () => {
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    count = 0; subCount = 0; isRunning = true;
    startBtn.disabled = true;
    counterDisplay.innerText = "本次進度：0";
    statusText.innerText = "鳴磬三聲，靜心...";
    
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({ title: '精進修行中', artist: '隨身道場' });
        silentAudio.play().catch(()=>{});
    }

    // 🌟 一聲接著一聲，疊在尾音處
    for (let i = 0; i < 3; i++) {
        if (!isRunning) return;
        await playWait(qingBuffer);
    }

    if (isRunning) {
        startTimer();
        statusText.innerText = "修行進行中...";
        autoInterval = setInterval(loop, 60000 / parseInt(document.getElementById('speed-input').value));
    }
};

// 圓滿：鳴磬三聲 (尾音銜接版)
async function finish() {
    isRunning = false; clearInterval(autoInterval); clearInterval(timerInterval);
    silentAudio.pause();
    statusText.innerText = "儀軌達成，鳴磬圓滿...";
    
    // 🌟 一聲接著一聲，疊在尾音處
    for (let i = 0; i < 3; i++) {
        await playWait(qingBuffer);
    }
    
    startBtn.disabled = false;
    statusText.innerText = "儀軌圓滿！";
}

document.getElementById('stop-btn').onclick = () => {
    isRunning = false; clearInterval(autoInterval); clearInterval(timerInterval);
    silentAudio.pause(); startBtn.disabled = false;
    statusText.innerText = "修行已暫停";
};

muyuBtn.onclick = () => {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const didStep = handleCount();
    if (didStep) {
        counterDisplay.innerText = `本次進度：${count}`;
        saveData();
        if (modeSelect.value === 'standard' && count % 100 === 0) play(qingBuffer);
        if (goalTypeSelect.value === 'count') {
            const tc = parseInt(document.getElementById('target-count').value);
            if (count >= tc) finish();
        }
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
    const sEl = document.getElementById('streak-counter');
    if(sEl) sEl.innerText = `連續修行：${streak} 天`;
};

document.getElementById('reset-btn').onclick = () => { 
    if(confirm("確定清除紀錄？")) { localStorage.clear(); location.reload(); } 
};
