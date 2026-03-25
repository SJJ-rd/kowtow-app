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

// --- 元素選取 ---
const counterDisplay = document.getElementById('counter'),
      statusText = document.getElementById('status-text'),
      startBtn = document.getElementById('start-btn'),
      stopBtn = document.getElementById('stop-btn'),
      targetInput = document.getElementById('target-input'),
      speedInput = document.getElementById('speed-input'),
      muyuBtn = document.getElementById('muyu-btn'),
      floatingText = document.getElementById('floating-text'),
      resetBtn = document.getElementById('reset-lifetime-btn');

// --- 音訊處理：串流模式解決 3.7MB 載入問題 ---
const muyuAudio = new Audio('muyu.mp3');
const qingAudio = new Audio('bells.mp3');

// 解決手機禁音限制：播放並立即暫停
function unlockAudio() {
    muyuAudio.play().then(() => muyuAudio.pause()).catch(()=>{});
    qingAudio.play().then(() => qingAudio.pause()).catch(()=>{});
}

function play(audioObj) {
    const clone = audioObj.cloneNode(); // 支援連續敲擊聲重疊
    clone.volume = 1.0;
    clone.play().catch(e => console.log("等待手勢解鎖"));
}

function playWait(audioObj) {
    return new Promise(resolve => {
        play(audioObj);
        setTimeout(resolve, 1200); // 等待引磬聲響完
    });
}

// --- 紀錄儲存 ---
const Storage = {
    load: function() {
        lifetimeCount = parseInt(localStorage.getItem(STORAGE_KEYS.LIFETIME)) || 0;
        streakCount = parseInt(localStorage.getItem(STORAGE_KEYS.STREAK)) || 0;
        lastPracticeDate = localStorage.getItem(STORAGE_KEYS.LAST_DATE) || "";
        
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        if (lastPracticeDate !== today && lastPracticeDate !== yesterday && lastPracticeDate !== "") {
            streakCount = 0; // 斷打卡
        }
        this.updateUI();

        if (localStorage.getItem(STORAGE_KEYS.TARGET)) targetInput.value = localStorage.getItem(STORAGE_KEYS.TARGET);
        if (localStorage.getItem(STORAGE_KEYS.SPEED)) speedInput.value = localStorage.getItem(STORAGE_KEYS.SPEED);
    },
    save: function() {
        const today = new Date().toDateString();
        if (lastPracticeDate !== today) {
            streakCount++;
            lastPracticeDate = today;
            localStorage.setItem(STORAGE_KEYS.STREAK, streakCount);
            localStorage.setItem(STORAGE_KEYS.LAST_DATE, lastPracticeDate);
        }
        lifetimeCount++;
        localStorage.setItem(STORAGE_KEYS.LIFETIME, lifetimeCount);
        this.updateUI();
    },
    updateUI: function() {
        document.getElementById('lifetime-counter').innerText = `總叩首：${lifetimeCount.toLocaleString()}`;
        document.getElementById('streak-counter').innerText = `連續修行：${streakCount} 天`;
    },
    reset: function() {
        if (confirm("確定要重設「總叩首」與「連續天數」嗎？\n此動作無法還原。")) {
            localStorage.clear();
            lifetimeCount = 0; streakCount = 0; lastPracticeDate = "";
            this.updateUI();
            statusText.innerText = "紀錄已全數重設";
        }
    }
};

// --- 修行邏輯 ---
async function perform() {
    if (!isRunning || isPausing) return;
    count++;
    Storage.save();
    counterDisplay.innerText = `叩首：${count}`;
    play(muyuAudio);
    
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
        await playWait(qingAudio);
        if (isRunning) {
            statusText.innerText = "修行進行中...";
            autoInterval = setInterval(perform, 60000 / parseInt(speedInput.value));
            isPausing = false;
        }
    }
}

async function startPractice() {
    unlockAudio(); // 關鍵解鎖
    count = 0; isRunning = true; startBtn.disabled = true;
    statusText.innerText = "鳴磬三聲，請靜心...";
    for (let i = 0; i < 3; i++) {
        if (!isRunning) return;
        await playWait(qingAudio);
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
    if(msg.includes("圓滿")) play(qingAudio);
}

// --- 事件綁定 ---
startBtn.onclick = startPractice;
stopBtn.onclick = () => stopPractice();
resetBtn.onclick = () => Storage.reset();

// 🌟 Apple 提醒：強化多行格式確保「每日重複」
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
        `DTEND:${d}T061500`,
        "RRULE:FREQ=DAILY",
        `DESCRIPTION:進入道場：${url}`,
        "END:VEVENT",
        "BEGIN:VEVENT",
        "SUMMARY:晚課修行 (叩首)",
        `DTSTART:${d}T170000`,
        `DTEND:${d}T171500`,
        "RRULE:FREQ=DAILY",
        `DESCRIPTION:進入道場：${url}`,
        "END:VEVENT",
        "END:VCALENDAR"
    ].join("\r\n");

    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([ics], {type:'text/calendar'}));
    link.download = 'kowtow_daily.ics';
    link.click();
};

document.getElementById('reminder-google-btn').onclick = () => {
    const isM = confirm("確定：設定早上 06:00 / 取消：設定下午 17:00");
    const t = new Date(); t.setHours(isM ? 6 : 17, 0, 0, 0);
    const fmt = d => d.toISOString().replace(/-|:|\.\d+/g, "");
    window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(isM?"早課修行":"晚課修行")}&dates=${fmt(t)}/${fmt(new Date(t.getTime()+900000))}&recur=RRULE:FREQ=DAILY`, '_blank');
};

muyuBtn.onclick = () => {
    unlockAudio();
    if (!isRunning && !isPausing) {
        count++; Storage.save();
        counterDisplay.innerText = `叩首：${count}`;
        play(muyuAudio);
        floatingText.classList.remove('animate-text'); void floatingText.offsetWidth; floatingText.classList.add('animate-text');
        if (count % 100 === 0) play(qingAudio);
    }
};

window.onload = () => {
    Storage.load();
    statusText.innerText = "道場已就緒";
};
