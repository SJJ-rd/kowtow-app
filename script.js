let count = 0;
let autoInterval = null;
let isRunning = false;
let isPausing = false;

// 🌟 1. 啟動專業音效引擎 (相容各種瀏覽器)
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();
let muyuBuffer = null;
let qingBuffer = null;

// 🌟 2. 蘋果 iOS 專屬「破冰解鎖」機制
let isUnlocked = false;
function unlockAudio() {
    if (isUnlocked) return;
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    // 製造一個 0.01 秒的「無聲靜音」，騙過手機安全機制，強制開啟喇叭
    const buffer = audioCtx.createBuffer(1, 1, 22050);
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    source.start(0);
    
    isUnlocked = true;
    // 解鎖成功後，移除這個監聽器，不浪費效能
    document.removeEventListener('touchstart', unlockAudio);
    document.removeEventListener('click', unlockAudio);
}
// 只要使用者的手指在網頁上點擊任何一個地方，就立刻解鎖！
document.addEventListener('touchstart', unlockAudio);
document.addEventListener('click', unlockAudio);

// 取得 HTML 元素
const counterDisplay = document.getElementById('counter');
const statusText = document.getElementById('status-text');
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const targetInput = document.getElementById('target-input');
const speedInput = document.getElementById('speed-input');
const testMuyuBtn = document.getElementById('test-muyu-btn');
const testQingBtn = document.getElementById('test-qing-btn');
const muyuBtn = document.getElementById('muyu-btn');
const floatingText = document.getElementById('floating-text');

// 🌟 3. 安全解碼包裝 (拯救較舊的手機瀏覽器)
function safeDecodeAudio(arrayBuffer) {
    return new Promise((resolve, reject) => {
        audioCtx.decodeAudioData(arrayBuffer, resolve, reject);
    });
}

// 載入音訊
async function loadAudio() {
    try {
        statusText.innerText = "音訊載入中...";
        // 加上 ./ 確保在 GitHub Pages 上路徑絕對正確
        const [muyuRes, qingRes] = await Promise.all([
            fetch('./muyu.mp3'),
            fetch('./bells.mp3')
        ]);
        
        if (!muyuRes.ok || !qingRes.ok) throw new Error("找不到音檔");

        const muyuArray = await muyuRes.arrayBuffer();
        const qingArray = await qingRes.arrayBuffer();
        
        muyuBuffer = await safeDecodeAudio(muyuArray);
        qingBuffer = await safeDecodeAudio(qingArray);
        
        statusText.innerText = "就緒，請按開始修行";
    } catch (err) {
        console.error("音訊載入失敗:", err);
        statusText.innerText = "音訊載入失敗，請重新整理";
    }
}
loadAudio();

// 從記憶體瞬間播放音效
function playBuffer(buffer, vol = 1.0) {
    if (!buffer || !isUnlocked) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    const source = audioCtx.createBufferSource();
    const gainNode = audioCtx.createGain();
    
    source.buffer = buffer;
    gainNode.gain.value = vol;
    
    source.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    source.start(0);
}

// 專業版播放並等待
function playAndWait(buffer, vol = 1.0, overlapSec = 0) {
    return new Promise((resolve) => {
        if (!buffer || !isUnlocked) { resolve(); return; }
        
        playBuffer(buffer, vol);
        const durationMs = buffer.duration * 1000; 
        const waitTime = Math.max(0, durationMs - (overlapSec * 1000));
        
        setTimeout(() => resolve(), waitTime);
    });
}

// 測試按鈕
testMuyuBtn.addEventListener('click', () => { playBuffer(muyuBuffer); });
testQingBtn.addEventListener('click', () => { playBuffer(qingBuffer); });

// 主要敲擊邏輯
async function performTap() {
    if (!isRunning || isPausing) return;
    
    count++;
    counterDisplay.innerText = `叩首：${count}`;
    playBuffer(muyuBuffer, 1.0);

    floatingText.classList.remove('animate-text');
    void floatingText.offsetWidth;
    floatingText.classList.add('animate-text');

    const target = parseInt(targetInput.value) || 108;
    if (count >= target) {
        finishPractice();
        return; 
    }

    if (count % 100 === 0) {
        isPausing = true;               
        clearInterval(autoInterval);    
        autoInterval = null;

        if (isRunning) { 
            statusText.innerText = `已滿 ${count} 下，鳴引磬迴向...`;
            await playAndWait(qingBuffer, 0.9, 0.2); 
        }

        if (isRunning) {
            statusText.innerText = "修行進行中...";
            const bpm = parseInt(speedInput.value) || 60;
            const intervalMs = 60000 / bpm;
            autoInterval = setInterval(performTap, intervalMs); 
            isPausing = false; 
        } else {
            isPausing = false; 
        }
    }
}

// 開始儀軌
async function startPractice() {
    if (isRunning) return;
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    
    count = 0;
    counterDisplay.innerText = "叩首：0";
    isRunning = true;
    isPausing = false;
    startBtn.disabled = true;
    
    statusText.innerText = "鳴引磬三聲，請靜心...";

    for (let i = 0; i < 3; i++) {
        if (!isRunning) return; 
        await playAndWait(qingBuffer, 0.9, 0.5); 
    }

    if (!isRunning) return; 

    statusText.innerText = "修行進行中...";
    const bpm = parseInt(speedInput.value) || 60;
    const intervalMs = 60000 / bpm;
    
    autoInterval = setInterval(performTap, intervalMs);
}

function stopPractice() {
    isRunning = false;
    isPausing = false;
    clearInterval(autoInterval);
    autoInterval = null;
    startBtn.disabled = false;
    statusText.innerText = "已停止修行";
}

// 結束儀軌
async function finishPractice() {
    isRunning = false;
    isPausing = false;
    clearInterval(autoInterval);
    autoInterval = null;
    
    startBtn.disabled = true; 
    statusText.innerText = "目標達成，鳴引磬三聲迴向...";

    for (let i = 0; i < 3; i++) {
        await playAndWait(qingBuffer, 1.0, 0.5); 
    }

    startBtn.disabled = false;
    statusText.innerText = "儀軌圓滿，目標達成！";
}

startBtn.addEventListener('click', startPractice);
stopBtn.addEventListener('click', stopPractice);

muyuBtn.addEventListener('click', () => {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    if (!isRunning && !isPausing) {
        count++;
        counterDisplay.innerText = `叩首：${count}`;
        playBuffer(muyuBuffer, 1.0);
        
        floatingText.classList.remove('animate-text');
        void floatingText.offsetWidth;
        floatingText.classList.add('animate-text');

        if (count > 0 && count % 100 === 0) {
            playBuffer(qingBuffer, 0.8);
        }
    }
});
