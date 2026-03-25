// --- 核心變數 ---
let count = 0, autoInterval = null, isRunning = false, isPausing = false;
let lifetimeCount = 0, streakCount = 0, lastPracticeDate = "";

const STORAGE_KEYS = {
    LIFETIME: 'kowtow_lifetime_total',
    STREAK: 'kowtow_streak_days',
    LAST_DATE: 'kowtow_last_date',
    TARGET: 'kowtow_setting_target',
    SPEED: 'kowtow_setting_speed'
};

// --- Web Audio 引擎 (零延遲關鍵) ---
let audioCtx = null;
let muyuBuffer = null;
let qingBuffer = null;

const counterDisplay = document.getElementById('counter'),
      statusText = document.getElementById('status-text'),
      startBtn = document.getElementById('start-btn'),
      stopBtn = document.getElementById('stop-btn'),
      targetInput = document.getElementById('target-input'),
      speedInput = document.getElementById('speed-input'),
      muyuBtn = document.getElementById('muyu-btn'),
      floatingText = document.getElementById('floating-text'),
      resetBtn = document.getElementById('reset-lifetime-btn');

// 🌟 初始化音訊引擎
function initAudioEngine() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

// 🌟 下載並解碼音訊
async function loadSound(url) {
    const resp = await fetch(url);
    const arrayBuf = await resp.arrayBuffer();
    return await audioCtx.decodeAudioData(arrayBuf);
}

async function preloadResources() {
    try {
        statusText.innerText = "接引音訊中 (3.7MB 較大)...";
        // 為了啟動引擎，我們在第一次載入前不初始化，等按鈕觸發
        // 但為了流暢度，我們還是先背景下載
        const [mBuf, qBuf] = await Promise.all([
            fetch('muyu.mp3').then(r => r.arrayBuffer()),
            fetch('bells.mp3').then(r => r.arrayBuffer())
        ]);
        
        // 暫存資料，等使用者點擊後再解碼（解決 Chrome/Safari 鎖定）
        window.tempM = mBuf;
        window.tempQ = qBuf;

        startBtn.disabled = false;
        startBtn.innerText = "開始修行";
        statusText.innerText = "道場已就緒，請點擊開始";
    } catch (e) {
        statusText.innerText = "載入失敗，請檢查網路";
    }
}

// 🌟 播放函數 (Web Audio 版：零延遲)
function playEffect(buffer) {
    if (!buffer || !audioCtx) return;
    initAudioEngine();
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    source.start(0);
}

function playWait(buffer) {
    return new Promise(resolve => {
        playEffect(buffer);
        setTimeout(resolve, 1200);
    });
}

// --- 紀錄儲存 ---
const Storage = {
    load: function() {
        lifetimeCount = parseInt(localStorage.getItem(STORAGE_KEYS.LIFETIME)) || 0;
        streakCount = parseInt(localStorage.getItem(STORAGE_KEYS.STREAK)) || 0;
        lastPracticeDate = localStorage.getItem(STORAGE_KEYS.LAST_DATE) || "";
        this.updateUI();
        if (localStorage.getItem(STORAGE_KEYS.TARGET)) targetInput.value = localStorage.getItem(STORAGE_KEYS.TARGET);
        if (localStorage.getItem(STORAGE_KEYS.SPEED)) speedInput.value = localStorage.getItem(STORAGE_KEYS.SPEED);
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

// --- 修行邏輯 ---
async function perform() {
    if (!isRunning || isPausing) return;
    count++; Storage.save();
    counterDisplay.innerText = `叩首：${count}`;
    playEffect(muyuBuffer);
    
    floatingText.classList.remove('animate-text');
    void floatingText.offsetWidth;
    floatingText.classList.add('animate-text');

    if (count >= parseInt(targetInput.value)) {
        stopPractice("目標達成，功德圓滿");
        return;
    }

    if (count % 100 === 0) {
        isPausing = true; clearInterval(autoInterval);
        statusText.innerText = `已滿 ${count} 下，鳴磬中...`;
        await playWait(qingBuffer);
        if (isRunning) {
            statusText.innerText = "修行進行中...";
            autoInterval = setInterval(perform, 60000 / parseInt(speedInput.value));
            isPausing = false;
        }
    }
}

async function startPractice() {
    initAudioEngine();
    
    // 如果還沒解碼，現在解碼 (使用者觸發的一瞬間)
    if (!muyuBuffer) {
        statusText.innerText = "正在解碼大音檔...";
        muyuBuffer = await audioCtx.decodeAudioData(window.tempM);
        qingBuffer = await audioCtx.decodeAudioData(window.tempQ);
    }

    count = 0; isRunning = true; startBtn.disabled = true;
    statusText.innerText = "鳴磬三聲，請靜心...";
    for (let i = 0; i < 3; i++) {
        if (!isRunning) return;
        await playWait(qingBuffer);
    }
    if (isRunning) {
        statusText.innerText = "修行進行中...";
        autoInterval = setInterval(perform, 60000 / parseInt(speedInput.value));
    }
}

function stopPractice(msg = "已停止修行") {
    isRunning = false; isPausing = false;
    clearInterval(autoInterval);
    startBtn.disabled = false;
    statusText.innerText = msg;
    if(msg.includes("圓滿")) playEffect(qingBuffer);
}

// --- 事件綁定 ---
startBtn.onclick = startPractice;
stopBtn.onclick = () => stopPractice();
resetBtn.onclick = () => {
    if (confirm("確定要重設紀錄嗎？")) {
        localStorage.clear();
        location.reload();
    }
};

// 🌟 Apple 提醒：強化時區格式 (解決不重複問題)
document.getElementById('reminder-apple-btn').onclick = () => {
    const url = window.location.href;
    const now = new Date();
    const pad = n => n < 10 ? '0' + n : n;
    const d = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}`;

    const ics = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "BEGIN:VEVENT",
        "SUMMARY:早課修行 (叩首)",
        `DTSTART;TZID=Asia/Taipei:${d}T060000`,
        "RRULE:FREQ=DAILY",
        `DESCRIPTION:進入道場：${url}`,
        "END:VEVENT",
        "BEGIN:VEVENT",
        "SUMMARY:晚課修行 (叩首)",
        `DTSTART;TZID=Asia/Taipei:${d}T170000`,
        "RRULE:FREQ=DAILY",
        `DESCRIPTION:進入道場：${url}`,
        "END:VEVENT",
        "END:VCALENDAR"
    ].join("\r\n");

    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([ics], {type:'text/calendar'}));
    link.download = 'kowtow.ics';
    link.click();
};

document.getElementById('reminder-google-btn').onclick = () => {
    const isM = confirm("確定：06:00 / 取消：17:00");
    const t = new Date(); t.setHours(isM ? 6 : 17, 0, 0, 0);
    const fmt = d => d.toISOString().replace(/-|:|\.\d+/g, "");
    window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(isM?"早課":"晚課")}&dates=${fmt(t)}/${fmt(new Date(t.getTime()+900000))}&recur=RRULE:FREQ=DAILY`, '_blank');
};

muyuBtn.onclick = async () => {
    initAudioEngine();
    // 如果手動點擊時還沒解碼
    if (!muyuBuffer && window.tempM) {
        muyuBuffer = await audioCtx.decodeAudioData(window.tempM);
        qingBuffer = await audioCtx.decodeAudioData(window.tempQ);
    }
    if (!isRunning && !isPausing) {
        count++; Storage.save();
        counterDisplay.innerText = `叩首：${count}`;
        playEffect(muyuBuffer);
        floatingText.classList.remove('animate-text'); void floatingText.offsetWidth; floatingText.classList.add('animate-text');
        if (count % 100 === 0) playEffect(qingBuffer);
    }
};

window.onload = () => {
    Storage.load();
    preloadResources();
};
