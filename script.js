// --- 基礎變數 ---
let count = 0, subCount = 0, isRunning = false, isPausing = false;
let lifetimeCount = 0;
let autoTimer = null, timerInterval = null;
let secondsRemaining = 0, secondsElapsed = 0;

// Web Audio 引擎
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = new AudioContext();
let muyuBuffer = null, qingBuffer = null;

// 元素宣告
const statusText = document.getElementById('status-text'),
      timerClock = document.getElementById('timer-clock'),
      timerLabel = document.getElementById('timer-label'),
      counterDisplay = document.getElementById('counter'),
      startBtn = document.getElementById('start-btn'),
      muyuBtn = document.getElementById('muyu-btn'),
      qingBtn = document.getElementById('qing-btn'),
      overlay = document.getElementById('force-start-overlay'),
      modeSelect = document.getElementById('mode-select'),
      goalTypeSelect = document.getElementById('goal-type'),
      speedInput = document.getElementById('speed-input');

// 目標類型切換
goalTypeSelect.addEventListener('change', function() {
    const isTime = this.value === 'time';
    document.getElementById('goal-time-input').style.display = isTime ? 'block' : 'none';
    document.getElementById('goal-count-input').style.display = isTime ? 'none' : 'block';
    timerLabel.innerText = isTime ? "修行倒數" : "已修持時間";
    timerClock.innerText = isTime ? document.getElementById('target-time').value + ":00" : "00:00";
});

// 背景播放維持
const silentAudio = new Audio();
silentAudio.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YQAAAAA=";
silentAudio.loop = true;

// 1. 初始化資源
async function handleEntry() {
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    overlay.style.display = 'none';
    statusText.innerText = "正在召喚資源...";
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
    } catch (e) { statusText.innerText = "音訊載入失敗"; }
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

// 🌟 參數調整位置：3.0 為餘音重疊秒數 (3s)
function playWait(buffer) {
    return new Promise(resolve => {
        play(buffer);
        const overlapSeconds = 3.0; // <--- 這裡已改為 3.0 秒
        // 計算延遲：如果音檔長度大於 3 秒，則在結束前 3 秒觸發下一聲；否則設為極短延遲
        const delay = (buffer.duration > overlapSeconds) ? (buffer.duration - overlapSeconds) * 1000 : 100;
        setTimeout(resolve, delay);
    });
}

// 2. 修行核心計數邏輯
function handleCount(source = 'auto') {
    const mode = modeSelect.value;
    play(muyuBuffer);
    
    let incremented = false;
    if (mode === 'recitation') {
        subCount++;
        if (subCount >= 5) { subCount = 0; count++; incremented = true; }
    } else {
        count++; incremented = true;
    }

    if (incremented) {
        counterDisplay.innerText = `本次進度：${count}`;
        saveData();
        if (mode === 'standard' && count % 100 === 0) {
            if (source === 'auto') {
                isPausing = true;
                statusText.innerText = `滿 ${count} 下，鳴磬提醒...`;
                play(qingBuffer);
                setTimeout(() => {
                    if (isRunning) {
                        isPausing = false;
                        statusText.innerText = "修行進行中...";
                        scheduleNextTap();
                    }
                }, 1500);
                return 'paused'; 
            } else {
                play(qingBuffer);
            }
        }
    }
    return incremented;
}

// 自動敲擊排程
function scheduleNextTap() {
    if (!isRunning || isPausing) return;
    const bpm = parseInt(speedInput.value) || 60;
    const interval = 60000 / bpm;

    autoTimer = setTimeout(async () => {
        const result = handleCount('auto');
        if (goalTypeSelect.value === 'count' && count >= parseInt(document.getElementById('target-count').value)) {
            finish(); return;
        }
        if (result !== 'paused' && isRunning) scheduleNextTap();
    }, interval);
}

// 3. 計時器與控制
function startTimer() {
    secondsElapsed = 0;
    secondsRemaining = parseInt(document.getElementById('target-time').value) * 60;
    timerInterval = setInterval(() => {
        if (!isRunning || isPausing) return;
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

startBtn.onclick = async () => {
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    count = 0; subCount = 0; isRunning = true; startBtn.disabled = true;
    statusText.innerText = "儀軌開始，鳴磬三聲...";
    silentAudio.play().catch(()=>{});
    
    // 🌟 這裡會執行 3.0 秒的高密度重疊鳴磬
    for (let i = 0; i < 3; i++) {
        if(!isRunning) return;
        await playWait(qingBuffer);
    }
    
    if (isRunning) {
        startTimer();
        statusText.innerText = "修行進行中...";
        scheduleNextTap();
    }
};

async function finish() {
    isRunning = false; 
    clearTimeout(autoTimer);
    clearInterval(timerInterval);
    statusText.innerText = "目標達成，圓滿迴向中...";
    // 🌟 結尾三聲同樣重疊 3.0 秒
    for (let i = 0; i < 3; i++) { await playWait(qingBuffer); }
    startBtn.disabled = false; silentAudio.pause();
    statusText.innerText = "儀軌圓滿！";
}

document.getElementById('stop-btn').onclick = () => {
    isRunning = false; isPausing = false;
    clearTimeout(autoTimer); clearInterval(timerInterval);
    startBtn.disabled = false; silentAudio.pause();
    statusText.innerText = "修行已停止";
};

// 手動操作
muyuBtn.onclick = () => {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    handleCount('manual');
    const ft = document.getElementById('float-muyu');
    ft.classList.remove('animate-up'); void ft.offsetWidth; ft.classList.add('animate-up');
    if (goalTypeSelect.value === 'count' && count >= parseInt(document.getElementById('target-count').value)) finish();
};

qingBtn.onclick = () => {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    play(qingBuffer);
    const ft = document.getElementById('float-qing');
    ft.classList.remove('animate-up'); void ft.offsetWidth; ft.classList.add('animate-up');
};

function saveData() {
    lifetimeCount++;
    localStorage.setItem('kowtow_total', lifetimeCount);
    document.getElementById('lifetime-counter').innerText = `累計進度：${lifetimeCount.toLocaleString()}`;
}

window.onload = () => {
    lifetimeCount = parseInt(localStorage.getItem('kowtow_total')) || 0;
    document.getElementById('lifetime-counter').innerText = `累計進度：${lifetimeCount.toLocaleString()}`;
};

document.getElementById('reset-btn').onclick = () => { if(confirm("確定重設紀錄？")){localStorage.clear(); location.reload();} };
