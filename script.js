let count = 0;
let autoInterval = null;
let isRunning = false;
let isPausing = false;

// 🌟 啟動專業音效引擎 (Web Audio API)
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

// 用來儲存預載入的音訊記憶體
let muyuBuffer = null;
let qingBuffer = null;

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

// 🌟 預先載入音訊檔案到記憶體中 (零延遲的關鍵)
async function loadAudio() {
    try {
        statusText.innerText = "音訊載入中...";
        // 同時下載木魚和引磬
        const [muyuRes, qingRes] = await Promise.all([
            fetch('muyu.mp3'),
            fetch('bells.mp3')
        ]);
        const muyuArray = await muyuRes.arrayBuffer();
        const qingArray = await qingRes.arrayBuffer();
        
        // 解碼並存入記憶體
        muyuBuffer = await audioCtx.decodeAudioData(muyuArray);
        qingBuffer = await audioCtx.decodeAudioData(qingArray);
        statusText.innerText = "就緒，請按開始修行";
    } catch (err) {
        console.error("音訊載入失敗:", err);
        statusText.innerText = "音訊載入失敗，請檢查網路連線";
    }
}
// 網頁開啟時立即執行載入
loadAudio();

// 🌟 從記憶體瞬間播放音效 (手機絕對不卡頓)
function playBuffer(buffer, vol = 1.0) {
    if (!buffer) return;
    // 解除手機瀏覽器的靜音鎖定
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    const source = audioCtx.createBufferSource();
    const gainNode = audioCtx.createGain();
    
    source.buffer = buffer;
    gainNode.gain.value = vol;
    
    source.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    source.start(0);
}

// 🌟 專業版播放並等待 (利用精準時長計算重疊)
function playAndWait(buffer, vol = 1.0, overlapSec = 0) {
    return new Promise((resolve) => {
        if (!buffer) { resolve(); return; }
        
        playBuffer(buffer, vol);
        
        // 直接讀取記憶體中的真實時長 (毫秒)
        const durationMs = buffer.duration * 1000; 
        const waitTime = Math.max(0, durationMs - (overlapSec * 1000));
        
        setTimeout(() => resolve(), waitTime);
    });
}

// 測試按鈕事件 (加入 resume 解鎖手機聲音)
testMuyuBtn.addEventListener('click', () => { 
    if (audioCtx.state === 'suspended') audioCtx.resume();
    playBuffer(muyuBuffer); 
});
testQingBtn.addEventListener('click', () => { 
    if (audioCtx.state === 'suspended') audioCtx.resume();
    playBuffer(qingBuffer); 
});

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

async function startPractice() {
    if (isRunning) return;
    
    // 關鍵！點擊開始時，強制喚醒手機音效引擎
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
    // 關鍵！喚醒手機音效引擎
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
