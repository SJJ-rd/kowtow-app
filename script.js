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

// --- Web Audio 引擎 (解決沒聲音與延遲的終極方案) ---
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = new AudioContext(); 
let muyuBuffer = null, qingBuffer = null;

const counterDisplay = document.getElementById('counter'),
      statusText = document.getElementById('status-text'),
      startBtn = document.getElementById('start-btn'),
      muyuBtn = document.getElementById('muyu-btn'),
      floatingText = document.getElementById('floating-text');

// 🌟 強制喚醒瀏覽器音訊 (解鎖 Chrome/Safari 關鍵)
async function unlockAudio() {
    if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
    }
}

// 載入 25KB 小音檔
async function loadBuffer(url) {
    const res = await fetch(url);
    const arrayBuffer = await res.arrayBuffer();
    return await audioCtx.decodeAudioData(arrayBuffer);
}

// 初始化資源
async function init() {
    try {
        statusText.innerText = "淨化道場中...";
        const [mBuf, qBuf] = await Promise.all([
            loadBuffer('muyu.mp3'),
            loadBuffer('bells.mp3')
        ]);
        muyuBuffer = mBuf;
        qingBuffer = qBuf;
        
        startBtn.disabled = false;
        startBtn.innerText = "開始修行";
        statusText.innerText = "道場已就緒";
    } catch (e) {
        statusText.innerText = "載入失敗，請確認檔案在根目錄";
    }
}

// 零延遲播放函數
function playSound(buffer, vol = 1.0) {
    if (!buffer) return;
    const source = audioCtx.createBufferSource();
    const gainNode = audioCtx.createGain();
    source.buffer = buffer;
    gainNode.gain.value = vol;
    source.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    source.start(0);
}

// 儲存邏輯
const Storage = {
    load: function() {
        lifetimeCount = parseInt(localStorage.getItem(STORAGE_KEYS.LIFETIME)) || 0;
        streakCount = parseInt(localStorage.getItem(STORAGE_KEYS.STREAK)) || 0;
        lastPracticeDate = localStorage.getItem(STORAGE_KEYS.LAST_DATE) || "";
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

// 修行自動敲擊邏輯
async function performTap() {
    if (!isRunning || isPausing) return;
    count++; Storage.save();
    counterDisplay.innerText = `叩首：${count}`;
    playSound(muyuBuffer);
    
    // 動畫
    floatingText.classList.remove('animate-text');
    void floatingText.offsetWidth;
    floatingText.classList.add('animate-text');

    const target = parseInt(document.getElementById('target-input').value);
    if (count >= target) {
        stopPractice("目標達成，功德圓滿");
        return;
    }

    if (count % 100 === 0) {
        isPausing = true; clearInterval(autoInterval);
        statusText.innerText = `已滿 ${count} 下，鳴磬迴向...`;
        playSound(qingBuffer);
        setTimeout(() => {
            if (isRunning) {
                statusText.innerText = "修行進行中...";
                autoInterval = setInterval(performTap, 60000 / parseInt(document.getElementById('speed-input').value));
                isPausing = false;
            }
        }, 1500);
    }
}

// 開始按鈕
startBtn.onclick = async () => {
    await unlockAudio(); // 🌟 解鎖 Chrome
    count = 0; isRunning = true; startBtn.disabled = true;
    statusText.innerText = "鳴磬三聲，靜心...";
    
    for (let i = 0; i < 3; i++) {
        if (!isRunning) return;
        playSound(qingBuffer);
        await new Promise(r => setTimeout(r, 1200));
    }
    
    if (isRunning) {
        statusText.innerText = "修行進行中...";
        autoInterval = setInterval(performTap, 60000 / parseInt(document.getElementById('speed-input').value));
    }
};

// 停止按鈕
document.getElementById('stop-btn').onclick = () => stopPractice();

function stopPractice(msg = "已停止修行") {
    isRunning = false; isPausing = false;
    clearInterval(autoInterval);
    startBtn.disabled = false;
    startBtn.innerText = "重新開始";
    statusText.innerText = msg;
    if (msg.includes("圓滿")) playSound(qingBuffer, 1.0);
}

// 🌟 木魚手動敲擊 (同樣具備喚醒音訊功能)
muyuBtn.onclick = async () => {
    await unlockAudio(); 
    if (!isRunning && !isPausing) {
        count++; Storage.save();
        counterDisplay.innerText = `叩首：${count}`;
        playSound(muyuBuffer);
        floatingText.classList.remove('animate-text');
        void floatingText.offsetWidth;
        floatingText.classList.add('animate-text');
        if (count % 100 === 0) playSound(qingBuffer, 0.7);
    }
};

// 🌟 重設紀錄：強制清空並刷新的最穩方式
document.getElementById('reset-lifetime-btn').onclick = () => {
    if (confirm("確定要將「總叩首」與「連續打卡」紀錄永久歸零嗎？")) {
        localStorage.clear();
        location.reload(); 
    }
};

// 🌟 Apple 提醒：修正為 iPhone 100% 識別的每日重複格式
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
        `DTSTART:${d}T060000`,
        "RRULE:FREQ=DAILY", // 每日重複
        `DESCRIPTION:進入道場：${url}`,
        "END:VEVENT",
        "BEGIN:VEVENT",
        "SUMMARY:晚課修行 (叩首)",
        `DTSTART:${d}T170000`,
        "RRULE:FREQ=DAILY", // 每日重複
        `DESCRIPTION:進入道場：${url}`,
        "END:VEVENT",
        "END:VCALENDAR"
    ].join("\r\n");

    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([ics], {type:'text/calendar'}));
    link.download = 'kowtow_reminder.ics';
    link.click();
};

document.getElementById('reminder-google-btn').onclick = () => {
    const isM = confirm("選擇提醒時段：\n【確定】早上 06:00\n【取消】下午 17:00");
    const t = new Date(); t.setHours(isM ? 6 : 17, 0, 0, 0);
    const fmt = d => d.toISOString().replace(/-|:|\.\d+/g, "");
    window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(isM?"早課":"晚課")}&dates=${fmt(t)}/${fmt(new Date(t.getTime()+900000))}&recur=RRULE:FREQ=DAILY`, '_blank');
};

// 網頁開啟
window.onload = () => {
    Storage.load();
    init();
};
