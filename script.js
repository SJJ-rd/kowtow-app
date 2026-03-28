// --- 基礎變數 ---
let count = 0, subCount = 0, isRunning = false, isPausing = false;
let lifetimeCount = 0;
let autoInterval = null, timerInterval = null;
let secondsRemaining = 0, secondsElapsed = 0;

// Web Audio 引擎
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = new AudioContext();
let muyuBuffer = null, qingBuffer = null;

// 元素宣告
const statusText = document.getElementById('status-text'),
      timerClock = document.getElementById('timer-clock'),
      counterDisplay = document.getElementById('counter'),
      startBtn = document.getElementById('start-btn'),
      muyuBtn = document.getElementById('muyu-btn'),
      qingBtn = document.getElementById('qing-btn'), // 🌟 新增
      overlay = document.getElementById('force-start-overlay'),
      modeSelect = document.getElementById('mode-select'),
      goalTypeSelect = document.getElementById('goal-type');

// 介面連動
goalTypeSelect.addEventListener('change', function() {
    const isTime = this.value === 'time';
    document.getElementById('goal-time-input').style.display = isTime ? 'block' : 'none';
    document.getElementById('goal-count-input').style.display = isTime ? 'none' : 'block';
});

// 1. 初始化資源
async function handleEntry() {
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    overlay.style.display = 'none';
    loadResources();
}
overlay.addEventListener('click', handleEntry);

async function loadResources() {
    try {
        const ver = Date.now(); 
        const [mAB, qAB] = await Promise.all([
            fetch(`muyu.mp3?v=${ver}`).then(r => r.arrayBuffer()),
            fetch(`bells.mp3?v=${ver}`).then(r => r.arrayBuffer())
        ]);
        muyuBuffer = await audioCtx.decodeAudioData(mAB);
        qingBuffer = await audioCtx.decodeAudioData(qAB);
        startBtn.disabled = false;
    } catch (e) { alert("音訊載入失敗"); }
}

function play(buffer) {
    if (!buffer || !audioCtx) return;
    const s = audioCtx.createBufferSource();
    s.buffer = buffer; s.connect(audioCtx.destination);
    s.start(0);
}

// 🌟 核心：餘音銜接 (調整為 2.0s)
function playWait(buffer) {
    return new Promise(resolve => {
        play(buffer);
        const delay = (buffer.duration >2.0) ? (buffer.duration -2.0) * 1000 : 100;
        setTimeout(resolve, delay);
    });
}

// 數據管理
function saveData() {
    lifetimeCount++;
    localStorage.setItem('kowtow_total', lifetimeCount);
    document.getElementById('lifetime-counter').innerText = `累計進度：${lifetimeCount.toLocaleString()}`;
}

// 修行邏輯
async function finish() {
    isRunning = false; clearInterval(autoInterval); clearInterval(timerInterval);
    for (let i = 0; i < 3; i++) await playWait(qingBuffer);
    startBtn.disabled = false;
}

// 🌟 手動木魚點擊
muyuBtn.onclick = () => {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    play(muyuBuffer);
    
    // 計數邏輯
    if (modeSelect.value === 'recitation') {
        subCount++; if (subCount >= 5) { subCount = 0; count++; saveData(); }
    } else { count++; saveData(); }
    
    counterDisplay.innerText = `本次進度：${count}`;
    const ft = document.getElementById('float-muyu');
    ft.classList.remove('animate-up'); void ft.offsetWidth; ft.classList.add('animate-up');
};

// 🌟 新增：手動鳴磬點擊
qingBtn.onclick = () => {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    play(qingBuffer); // 單獨鳴響引磬聲
    
    const ft = document.getElementById('float-qing');
    ft.classList.remove('animate-up'); void ft.offsetWidth; ft.classList.add('animate-up');
};

// 修行啟動按鈕
startBtn.onclick = async () => {
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    count = 0; isRunning = true; startBtn.disabled = true;
    for (let i = 0; i < 3; i++) await playWait(qingBuffer);
    
    // 此處省略了自動計時與循環的重複代碼，請維持您原本 script.js 中的計時器邏輯
};

window.onload = () => {
    lifetimeCount = parseInt(localStorage.getItem('kowtow_total')) || 0;
    document.getElementById('lifetime-counter').innerText = `累計進度：${lifetimeCount.toLocaleString()}`;
};
