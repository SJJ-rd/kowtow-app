// 修行狀態控制
let count = 0;
let autoInterval = null;
let isRunning = false;
let isPausing = false;

// 資料儲存與打卡變數
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

// Web Audio API 引擎
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
document.addEventListener('touchstart', unlockAudio);
document.addEventListener('click', unlockAudio);

// 元素選取
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

// 載入音訊
async function loadAudio() {
    try {
        statusText.innerText = "音訊載入中...";
        const [muyuRes, qingRes] = await Promise.all([
            fetch('./muyu.mp3'), fetch('./bells.mp3')
        ]);
        const muyuArray = await muyuRes.arrayBuffer();
        const qingArray = await qingRes.arrayBuffer();
        muyuBuffer = await audioCtx.decodeAudioData(muyuArray);
        qingBuffer = await audioCtx.decodeAudioData(qingArray);
        statusText.innerText = "就緒，請按開始修行";
    } catch (err) {
        statusText.innerText = "音訊載入失敗，請重整";
    }
}

// 播放與儲存管理
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
        setTimeout(resolve, buffer.duration * 1000 - 100);
    });
}

// 修行邏輯
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

// 綁定事件
startBtn.addEventListener('click', startPractice);
stopBtn.addEventListener('click', stopPractice);
document.getElementById('reset-lifetime-btn').addEventListener('click', () => {
    if(confirm("重設所有紀錄？")) { localStorage.clear(); location.reload(); }
});

// 🌟 Google 提醒 (智慧選擇)
document.getElementById('reminder-google-btn').addEventListener('click', () => {
    const isMorning = confirm("確定：設定早上 06:00 早課\n取消：設定下午 17:00 晚課");
    const appUrl = window.location.href;
    const t = new Date();
    t.setHours(isMorning ? 6 : 17, 0, 0, 0);
    const end = new Date(t.getTime() + 15*60000);
    const pad = n => n < 10 ? '0' + n : n;
    const fmt = d => `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(isMorning?"早課修行":"晚課修行")}&dates=${fmt(t)}/${fmt(end)}&recur=RRULE:FREQ=DAILY`;
    window.open(url, '_blank');
});

// 🌟 Apple 提醒 (一鍵雙排程)
document.getElementById('reminder-apple-btn').addEventListener('click', () => {
    const appUrl = window.location.href;
    const now = new Date();
    const pad = n => n < 10 ? '0' + n : n;
    const fmt = d => `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
    
    const m = new Date(); m.setHours(6,0,0,0);
    const e = new Date(); e.setHours(17,0,0,0);

    const ics = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:早課修行
DTSTART:${fmt(m)}
DTEND:${fmt(new Date(m.getTime()+900000))}
RRULE:FREQ=DAILY
DESCRIPTION:開工修行：${appUrl}
BEGIN:VALARM
TRIGGER:-PT0M
ACTION:DISPLAY
END:VALARM
END:VEVENT
BEGIN:VEVENT
SUMMARY:晚課修行
DTSTART:${fmt(e)}
DTEND:${fmt(new Date(e.getTime()+900000))}
RRULE:FREQ=DAILY
DESCRIPTION:收工修行：${appUrl}
BEGIN:VALARM
TRIGGER:-PT0M
ACTION:DISPLAY
END:VALARM
END:VEVENT
END:VCALENDAR`.replace(/\n/g, "\r\n");

    const blob = new Blob([ics], {type:'text/calendar'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'kowtow.ics';
    link.click();
});

// 手動敲擊
muyuBtn.addEventListener('click', () => {
    if (!isRunning && !isPausing) {
        count++; StorageManager.recordPractice();
        counterDisplay.innerText = `叩首：${count}`;
        playBuffer(muyuBuffer);
        floatingText.classList.remove('animate-text');
        void floatingText.offsetWidth;
        floatingText.classList.add('animate-text');
        if (count % 100 === 0) playBuffer(qingBuffer, 0.7);
    }
});

window.onload = () => { StorageManager.init(); loadAudio(); };
