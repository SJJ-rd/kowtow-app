let count = 0;
let autoInterval = null;
let isRunning = false;
let isPausing = false;

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

const MUYU_FILE = 'muyu.mp3';
const QING_FILE = 'bells.mp3'; 

function forcePlay(fileName, vol = 1.0) {
    const audio = new Audio(fileName);
    audio.volume = vol;
    audio.play().catch(err => console.error("播放失敗:", err));
    audio.onended = () => audio.remove();
}

function playAndWait(fileName, vol = 1.0, overlapSec = 0) {
    return new Promise((resolve) => {
        const audio = new Audio();
        audio.volume = vol;
        
        audio.addEventListener('loadedmetadata', () => {
            const durationMs = audio.duration * 1000; 
            const waitTime = Math.max(0, durationMs - (overlapSec * 1000));
            
            audio.play().catch(err => {
                console.error("播放失敗:", err);
                resolve(); 
            });
            
            setTimeout(() => resolve(), waitTime);
        });

        audio.onended = () => audio.remove();
        audio.onerror = () => resolve(); 
        audio.src = fileName; 
    });
}

testMuyuBtn.addEventListener('click', () => { forcePlay(MUYU_FILE); });
testQingBtn.addEventListener('click', () => { forcePlay(QING_FILE); });

async function performTap() {
    if (!isRunning || isPausing) return;
    
    count++;
    // 🌟 修改這裡：動態更新的文字改為叩首
    counterDisplay.innerText = `叩首：${count}`;
    forcePlay(MUYU_FILE, 1.0);

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
            await playAndWait(QING_FILE, 0.9, 0.2); 
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
    
    count = 0;
    // 🌟 修改這裡：重新開始時歸零的文字改為叩首
    counterDisplay.innerText = "叩首：0";
    isRunning = true;
    isPausing = false;
    startBtn.disabled = true;
    
    statusText.innerText = "鳴引磬三聲，請靜心...";

    for (let i = 0; i < 3; i++) {
        if (!isRunning) return; 
        await playAndWait(QING_FILE, 0.9, 0.5); 
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
        await playAndWait(QING_FILE, 1.0, 0.5); 
    }

    startBtn.disabled = false;
    // 🌟 修改這裡：完成時的提示文字
    statusText.innerText = "儀軌圓滿，目標達成！";
}

startBtn.addEventListener('click', startPractice);
stopBtn.addEventListener('click', stopPractice);

muyuBtn.addEventListener('click', () => {
    if (!isRunning && !isPausing) {
        count++;
        // 🌟 修改這裡：手動點擊更新的文字改為叩首
        counterDisplay.innerText = `叩首：${count}`;
        forcePlay(MUYU_FILE, 1.0);
        
        floatingText.classList.remove('animate-text');
        void floatingText.offsetWidth;
        floatingText.classList.add('animate-text');

        if (count > 0 && count % 100 === 0) {
            forcePlay(QING_FILE, 0.8);
        }
    }
});