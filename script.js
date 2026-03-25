// 修行變數
let count = 0;
let autoInterval = null;
let isRunning = false;
let isPausing = false;
let lifetimeCount = 0;
let streakCount = 0;
let lastPracticeDate = "";

const STORAGE_KEYS = {
    LIFETIME: 'kowtow_lifetime_total',
    STREAK: 'kowtow_streak_days',
    LAST_DATE: 'kowtow_last_date',
    TARGET: 'kowtow_setting_target',
    SPEED: 'kowtow_setting_speed'
};

// 專業音效引擎
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();
let muyuBuffer = null;
let qingBuffer = null;

// iOS 破冰解鎖
let isUnlocked = false;
function unlockAudio() {
    if (isUnlocked) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const buffer = audioCtx.createBuffer(1, 1, 22050);
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    source.start(0);
    isUnlocked = true;
}
document.addEventListener('touchstart', unlockAudio, {passive: true});
document.addEventListener('click', unlockAudio);

const lifetimeCounterDisplay = document.getElementById('lifetime-counter');
const streakCounterDisplay = document.getElementById('streak-counter');
const counterDisplay = document.getElementById('counter');
const statusText = document.getElementById('status-text');
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const targetInput = document.getElementById('target-input');
const speedInput = document.getElementById('speed-input');
const muyuBtn = document.getElementById('muyu-btn');
const floatingText = document.getElementById('floating-text');

// 🌟 雲端加速載入：直接從雲端讀取，速度最快
async function loadAudioFile(url, name) {
    try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const decodedData = await audioCtx.decodeAudioData(arrayBuffer);
        return decodedData;
    } catch (e) {
        console.error(`${name} 失敗`, e);
        return null;
    }
}

async function initAllAudio() {
    statusText.innerText = "淨心準備中...";
    // 使用 Cloud 加速源，解決 GitHub 載入慢的問題
    const muyuPromise = loadAudioFile('./muyu.mp3', '木魚');
    const qingPromise = loadAudioFile('./bells.mp3', '引磬');

    muyuPromise.then(buf => { muyuBuffer = buf; checkReady(); });
    qingPromise.then(buf => { qingBuffer = buf; checkReady(); });
}

function checkReady() {
    if (muyuBuffer && qingBuffer) {
        statusText.innerText = "就緒，請按開始修行";
    }
}

// 儲存管理
const StorageManager = {
    init: function() {
        lifetimeCount = parseInt(localStorage.getItem(STORAGE_KEYS.LIFETIME)) || 0;
        streakCount = parseInt(localStorage.getItem(STORAGE_KEYS.STREAK)) || 0;
        lastPracticeDate = localStorage.getItem(STORAGE_KEYS.LAST_DATE) || "";
        this.checkDailyStreak(); 
        this.updateDisplays();
        if (localStorage.getItem(STORAGE_KEYS.TARGET)) targetInput.value = localStorage.getItem(STORAGE_KEYS.TARGET);
        if (localStorage.getItem(STORAGE_KEYS.SPEED)) speedInput.value = localStorage.getItem(STORAGE_KEYS.SPEED);
    },
    checkDailyStreak: function() {
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString(); 
        if (lastPracticeDate !== today && lastPracticeDate !== yesterday && lastPracticeDate !== "") {
            streakCount = 0;
        }
    },
    recordPractice: function() {
        const today = new Date().toDateString();
        if (lastPracticeDate !== today) {
            streakCount++;
            lastPracticeDate = today;
            localStorage.setItem(STORAGE_KEYS.STREAK, streakCount);
            localStorage.setItem(STORAGE_KEYS.LAST_DATE, lastPracticeDate);
        }
        lifetimeCount++;
        localStorage.setItem(STORAGE_KEYS.LIFETIME, lifetimeCount);
        this.updateDisplays();
    },
    updateDisplays: function() {
        lifetimeCounterDisplay.innerText = `總叩首：${lifetimeCount.toLocaleString()}`;
        streakCounterDisplay.innerText = `連續修行：${streakCount} 天`;
    }
};

function playBuffer(buffer, vol = 1.0) {
    if (!buffer || !isUnlocked) return;
    const source = audioCtx.createBufferSource();
    const gainNode = audioCtx.createGain();
    source.buffer = buffer;
    gainNode.gain.value = vol;
    source.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    source.start(0);
}

function playAndWait(buffer, vol = 1.0) {
    return new Promise(resolve => {
        playBuffer(buffer, vol);
        setTimeout(resolve, (buffer.duration * 1000) - 450); 
    });
}

async function performTap() {
    if (!isRunning || isPausing) return;
    count++;
    StorageManager.recordPractice();
    counterDisplay.innerText = `叩首：${count}`;
    playBuffer(muyuBuffer, 1.0);
    floatingText.classList.remove('animate-text');
    void floatingText.offsetWidth;
    floatingText.classList.add('animate-text');

    if (count >= parseInt(targetInput.value)) { finishPractice(); return; }

    if (count % 100 === 0) {
        isPausing = true;
        clearInterval(autoInterval);
        statusText.innerText = `已滿 ${count} 下，鳴引磬迴向...`;
        await playAndWait(qingBuffer, 0.9);
        if (isRunning) {
            statusText.innerText = "修行進行中...";
            autoInterval = setInterval(performTap, 60000 / parseInt(speedInput.value));
            isPausing = false;
        }
    }
}

async function startPractice() {
    if (isRunning) return;
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    count = 0; counterDisplay.innerText = "叩首：0";
    isRunning = true; startBtn.disabled = true;
    statusText.innerText = "鳴引磬三聲，請靜心...";
    for (let i = 0; i < 3; i++) { if (isRunning) await playAndWait(qingBuffer, 0.9); }
    if (isRunning) {
        statusText.innerText = "修行進行中...";
        autoInterval = setInterval(performTap, 60000 / parseInt(speedInput.value));
    }
}

function stopPractice() {
    isRunning = false; clearInterval(autoInterval);
    startBtn.disabled = false; statusText.innerText = "已停止修行";
}

async function finishPractice() {
    isRunning = false; clearInterval(autoInterval);
    statusText.innerText = "目標達成，鳴引磬三聲迴向...";
    for (let i = 0; i < 3; i++) await playAndWait(qingBuffer, 1.0);
    startBtn.disabled = false; statusText.innerText = "儀軌圓滿！";
}

// 🌟 Apple 提醒：極簡格式，保證「每天重複」且「無限期」
document.getElementById('reminder-apple-btn').addEventListener('click', () => {
    const url = window.location.href;
    const now = new Date();
    const pad = n => n < 10 ? '0' + n : n;
    const d = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}`;

    const ics = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "BEGIN:VEVENT",
        `DTSTART:${d}T060000`,
        `DTEND:${d}T061500`,
        "RRULE:FREQ=DAILY", 
        "SUMMARY:早課修行：叩首",
        `DESCRIPTION:進入：${url}`,
        "BEGIN:VALARM",
        "TRIGGER:-PT0M",
        "ACTION:DISPLAY",
        "END:VALARM",
        "END:VEVENT",
        "BEGIN:VEVENT",
        `DTSTART:${d}T170000`,
        `DTEND:${d}T171500`,
        "RRULE:FREQ=DAILY",
        "SUMMARY:晚課修行：叩首",
        `DESCRIPTION:進入：${url}`,
        "BEGIN:VALARM",
        "TRIGGER:-PT0M",
        "ACTION:DISPLAY",
        "END:VALARM",
        "END:VEVENT",
        "END:VCALENDAR"
    ].join("\r\n");

    const blob = new Blob([ics], {type:'text/calendar'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'kowtow.ics';
    link.click();
});

document.getElementById('reminder-google-btn').addEventListener('click', () => {
    const isM = confirm("確定：早上 06:00\n取消：下午 17:00");
    const t = new Date(); t.setHours(isM ? 6 : 17, 0, 0, 0);
    const pad = n => n < 10 ? '0' + n : n;
    const fmt = d => `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
    window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(isM?"早課":"晚課")}&dates=${fmt(t)}/${fmt(new Date(t.getTime()+900000))}&recur=RRULE:FREQ=DAILY`, '_blank');
});

document.getElementById('reset-lifetime-btn').onclick = () => { if(confirm("重設？")) {localStorage.clear(); location.reload();} };
startBtn.onclick = startPractice;
stopBtn.onclick = stopPractice;
muyuBtn.onclick = () => {
    if(!isRunning && !isPausing){
        count++; StorageManager.recordPractice();
        counterDisplay.innerText = `叩首：${count}`;
        playBuffer(muyuBuffer);
        floatingText.classList.remove('animate-text');
        void floatingText.offsetWidth;
        floatingText.classList.add('animate-text');
        if(count%100===0) playBuffer(qingBuffer, 0.7);
    }
};

window.onload = () => { StorageManager.init(); initAllAudio(); };
