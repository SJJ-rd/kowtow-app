// --- 基礎變數 ---
let count = 0, autoInterval = null, isRunning = false, isPausing = false;
let lifetimeCount = 0, streakCount = 0, lastPracticeDate = "";

const STORAGE_KEYS = {
    LIFETIME: 'kowtow_lifetime_total',
    STREAK: 'kowtow_streak_days',
    LAST_DATE: 'kowtow_last_date',
    TARGET: 'kowtow_setting_target',
    SPEED: 'kowtow_setting_speed'
};

// --- 音訊系統 ---
let audioCtx = null;
let muyuBuffer = null;
let qingBuffer = null;

const counterDisplay = document.getElementById('counter'),
      statusText = document.getElementById('status-text'),
      startBtn = document.getElementById('start-btn'),
      muyuBtn = document.getElementById('muyu-btn'),
      floatingText = document.getElementById('floating-text'),
      unlockOverlay = document.getElementById('audio-unlock-overlay');

// 🌟 1. 核心解鎖函數：確保點擊必有反應
function handleUnlock() {
    // 立即建立 Context (在點擊事件內)
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    
    // 隱藏遮罩
    unlockOverlay.style.opacity = '0';
    setTimeout(() => { unlockOverlay.style.display = 'none'; }, 500);
    
    // 開始載入資源 (如果還沒載入的話)
    initResources();
}

// 綁定解鎖事件 (同時支援點擊與觸摸)
unlockOverlay.addEventListener('click', handleUnlock);
unlockOverlay.addEventListener('touchstart', handleUnlock);

// 🌟 2. 資源載入器 (帶有路徑保險)
async function loadBuffer(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("File not found");
        const arrayBuffer = await response.arrayBuffer();
        return await audioCtx.decodeAudioData(arrayBuffer);
    } catch (e) {
        console.error("載入出錯:", url, e);
        return null;
    }
}

async function initResources() {
    statusText.innerText = "正在召喚木魚與引磬...";
    
    // 平行載入
    const mP = loadBuffer('muyu.mp3');
    const qP = loadBuffer('bells.mp3');

    muyuBuffer = await mP;
    qingBuffer = await qP;

    if (muyuBuffer && qingBuffer) {
        startBtn.disabled = false;
        startBtn.innerText = "開始修行";
        statusText.innerText = "道場就緒，請點擊開始";
    } else {
        statusText.innerText = "部分音訊載入失敗，請重整頁面";
    }
}

// 🌟 3. 播放函數 (Web Audio API)
function playSound(buffer, vol = 1.0) {
    if (!buffer || !audioCtx) return;
    const source = audioCtx.createBufferSource();
    const gainNode = audioCtx.createGain();
    source.buffer = buffer;
    gainNode.gain.value = vol;
    source.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    source.start(0);
}

// --- 4. 紀錄管理 ---
const Storage = {
    load: function() {
        lifetimeCount = parseInt(localStorage.getItem(STORAGE_KEYS.LIFETIME)) || 0;
        streakCount = parseInt(localStorage.getItem(STORAGE_KEYS.STREAK)) || 0;
        lastPracticeDate = localStorage.getItem(STORAGE_KEYS.LAST_DATE) || "";
        
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        if (lastPracticeDate !== today && lastPracticeDate !== yesterday && lastPracticeDate !== "") {
            streakCount = 0;
        }
        this.updateUI();
        if (localStorage.getItem(STORAGE_KEYS.TARGET)) document.getElementById('target-input').value = localStorage.getItem(STORAGE_KEYS.TARGET);
        if (localStorage.getItem(STORAGE_KEYS.SPEED)) document.getElementById('speed-input').value = localStorage.getItem(STORAGE_KEYS.SPEED);
    },
    save: function() {
        const today = new Date().toDateString();
        if (lastPracticeDate !== today) { streakCount++; lastPracticeDate = today; }
        lifetimeCount++;
        localStorage.setItem(STORAGE_KEYS.LIFETIME, lifetimeCount);
        localStorage.setItem(STORAGE_KEYS.STREAK, streakCount);
        localStorage.setItem(STORAGE_KEYS.LAST_DATE, lastPracticeDate);
        this.updateUI();
    },
    updateUI: function() {
        document.getElementById('lifetime-counter').innerText = `總叩首：${lifetimeCount.toLocaleString()}`;
        document.getElementById('streak-counter').innerText = `連續修行：${streakCount} 天`;
    }
};

// --- 5. 修行核心邏輯 ---
async function performTap() {
    if (!isRunning || isPausing) return;
    count++; Storage.save();
    counterDisplay.innerText = `叩首：${count}`;
    playSound(muyuBuffer, 1.0);
    
    floatingText.classList.remove('animate-text');
    void floatingText.offsetWidth;
    floatingText.classList.add('animate-text');

    if (count >= parseInt(document.getElementById('target-input').value)) {
        stopPractice("目標達成，功德圓滿");
        return;
    }

    if (count % 100 === 0) {
        isPausing = true; clearInterval(autoInterval);
        statusText.innerText = `已滿 ${count} 下，鳴磬迴向...`;
        playSound(qingBuffer, 0.9);
        setTimeout(() => {
            if (isRunning) {
                statusText.innerText = "修行進行中...";
                autoInterval = setInterval(performTap, 60000 / parseInt(document.getElementById('speed-input').value));
                isPausing = false;
            }
        }, 1500);
    }
}

startBtn.onclick = async () => {
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    count = 0; isRunning = true; startBtn.disabled = true;
    statusText.innerText = "鳴磬三聲，請靜心...";
    for (let i = 0; i < 3; i++) {
        if (!isRunning) return;
        playSound(qingBuffer, 0.9);
        await new Promise(r => setTimeout(r, 1200));
    }
    if (isRunning) {
        statusText.innerText = "修行進行中...";
        autoInterval = setInterval(performTap, 60000 / parseInt(document.getElementById('speed-input').value));
    }
};

document.getElementById('stop-btn').onclick = () => stopPractice();

function stopPractice(msg = "已停止修行") {
    isRunning = false; isPausing = false;
    clearInterval(autoInterval);
    startBtn.disabled = false;
    statusText.innerText = msg;
    if (msg.includes("圓滿")) playSound(qingBuffer, 1.0);
}

muyuBtn.onclick = () => {
    if (!isRunning && !isPausing) {
        count++; Storage.save();
        counterDisplay.innerText = `叩首：${count}`;
        playSound(muyuBuffer, 1.0);
        floatingText.classList.remove('animate-text');
        void floatingText.offsetWidth;
        floatingText.classList.add('animate-text');
        if (count % 100 === 0) playSound(qingBuffer, 0.7);
    }
};

// 🌟 重設功能：修正為直接清空並重整
document.getElementById('reset-lifetime-btn').onclick = () => {
    if (confirm("確定要將叩首紀錄全數重設嗎？")) {
        localStorage.clear();
        location.reload();
    }
};

// 🌟 Apple 提醒：修正為標準多行格式
document.getElementById('reminder-apple-btn').onclick = () => {
    const url = window.location.href;
    const now = new Date();
    const pad = n => n < 10 ? '0' + n : n;
    const d = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}`;

    const icsContent = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "BEGIN:VEVENT",
        "SUMMARY:早課修行 (叩首)",
        `DTSTART:${d}T060000`,
        `DTEND:${d}T061500`,
        "RRULE:FREQ=DAILY", // 👈 每日重複核心
        `DESCRIPTION:進入道場：${url}`,
        "END:VEVENT",
        "BEGIN:VEVENT",
        "SUMMARY:晚課修行 (叩首)",
        `DTSTART:${d}T170000`,
        `DTEND:${d}T171500`,
        "RRULE:FREQ=DAILY", // 👈 每日重複核心
        `DESCRIPTION:進入道場：${url}`,
        "END:VEVENT",
        "END:VCALENDAR"
    ].join("\r\n");

    const blob = new Blob([icsContent], {type:'text/calendar;charset=utf-8'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'kowtow_daily.ics';
    link.click();
};

document.getElementById('reminder-google-btn').onclick = () => {
    const isM = confirm("選擇時段：\n【確定】早上 06:00 / 【取消】下午 17:00");
    const t = new Date(); t.setHours(isM ? 6 : 17, 0, 0, 0);
    const fmt = d => d.toISOString().replace(/-|:|\.\d+/g, "");
    window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(isM?"早課修行":"晚課修行")}&dates=${fmt(t)}/${fmt(new Date(t.getTime()+900000))}&recur=RRULE:FREQ=DAILY`, '_blank');
};

// 初始化
window.onload = () => {
    Storage.load();
};
