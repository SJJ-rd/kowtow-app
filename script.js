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

// --- Web Audio 核心 (手機版沒聲音的救星) ---
let audioCtx = null;
let muyuBuffer = null;
let qingBuffer = null;

const counterDisplay = document.getElementById('counter'),
      statusText = document.getElementById('status-text'),
      startBtn = document.getElementById('start-btn'),
      muyuBtn = document.getElementById('muyu-btn'),
      floatingText = document.getElementById('floating-text'),
      unlockOverlay = document.getElementById('audio-unlock-overlay');

// 🌟 強制解鎖音訊：在手機觸摸的一瞬間執行
async function forceUnlockAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
    }
    // 隱藏解鎖層
    unlockOverlay.style.display = 'none';
    console.log("AudioContext Unlocked");
}

// 監聽解鎖層點擊
unlockOverlay.addEventListener('touchstart', forceUnlockAudio);
unlockOverlay.addEventListener('click', forceUnlockAudio);

// 🌟 強化版載入器
async function fetchAndDecode(url, name) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`${name} 檔案不存在`);
        const arrayBuffer = await response.arrayBuffer();
        // 為了相容性，這裡在解碼前先確保 Context 存在
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        return await audioCtx.decodeAudioData(arrayBuffer);
    } catch (e) {
        statusText.innerText = `錯誤: ${e.message}`;
        return null;
    }
}

async function initResources() {
    // 木魚先載 (25KB 很快)
    fetchAndDecode('./muyu.mp3', '木魚').then(buf => {
        muyuBuffer = buf;
        checkReady();
    });
    // 引磬後載
    fetchAndDecode('./bells.mp3', '引磬').then(buf => {
        qingBuffer = buf;
        checkReady();
    });
}

function checkReady() {
    if (muyuBuffer && qingBuffer) {
        startBtn.disabled = false;
        startBtn.innerText = "開始修行";
        statusText.innerText = "道場已就緒";
    } else if (muyuBuffer) {
        statusText.innerText = "木魚已就緒，引磬加載中...";
    }
}

// 播放函數 (零延遲)
function playEffect(buffer, vol = 1.0) {
    if (!buffer || !audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    const source = audioCtx.createBufferSource();
    const gainNode = audioCtx.createGain();
    source.buffer = buffer;
    gainNode.gain.value = vol;
    source.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    source.start(0);
}

// 紀錄管理
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

// 修行執行
async function perform() {
    if (!isRunning || isPausing) return;
    count++; Storage.save();
    counterDisplay.innerText = `叩首：${count}`;
    playEffect(muyuBuffer);
    
    floatingText.classList.remove('animate-text');
    void floatingText.offsetWidth;
    floatingText.classList.add('animate-text');

    if (count >= parseInt(document.getElementById('target-input').value)) {
        stopPractice("目標達成，功德圓滿");
        return;
    }

    if (count % 100 === 0) {
        isPausing = true; clearInterval(autoInterval);
        statusText.innerText = `已滿 ${count} 下，鳴磬中...`;
        playEffect(qingBuffer);
        setTimeout(() => {
            if (isRunning) {
                statusText.innerText = "修行進行中...";
                autoInterval = setInterval(perform, 60000 / parseInt(document.getElementById('speed-input').value));
                isPausing = false;
            }
        }, 1500);
    }
}

// 按鈕事件
startBtn.onclick = async () => {
    await forceUnlockAudio();
    count = 0; isRunning = true; startBtn.disabled = true;
    statusText.innerText = "鳴磬三聲，靜心...";
    
    for (let i = 0; i < 3; i++) {
        if (!isRunning) return;
        playEffect(qingBuffer);
        await new Promise(r => setTimeout(r, 1200));
    }
    
    if (isRunning) {
        statusText.innerText = "修行進行中...";
        autoInterval = setInterval(perform, 60000 / parseInt(document.getElementById('speed-input').value));
    }
};

document.getElementById('stop-btn').onclick = () => stopPractice();

function stopPractice(msg = "已停止修行") {
    isRunning = false; isPausing = false;
    clearInterval(autoInterval);
    startBtn.disabled = false;
    statusText.innerText = msg;
    if (msg.includes("圓滿")) playEffect(qingBuffer, 1.0);
}

muyuBtn.onclick = async () => {
    await forceUnlockAudio();
    if (!isRunning && !isPausing) {
        count++; Storage.save();
        counterDisplay.innerText = `叩首：${count}`;
        playEffect(muyuBuffer);
        floatingText.classList.remove('animate-text');
        void floatingText.offsetWidth;
        floatingText.classList.add('animate-text');
        if (count % 100 === 0) playEffect(qingBuffer);
    }
};

document.getElementById('reset-lifetime-btn').onclick = () => {
    if (confirm("確定要將紀錄全數重設嗎？")) {
        localStorage.clear();
        location.reload();
    }
};

// 🌟 Apple 提醒：極致標準格式
document.getElementById('reminder-apple-btn').onclick = () => {
    const url = window.location.href;
    const d = new Date().toISOString().replace(/-|:|\.\d+/g, "").split("T")[0];
    const ics = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "BEGIN:VEVENT",
        "SUMMARY:早課修行",
        `DTSTART:${d}T060000`,
        "RRULE:FREQ=DAILY",
        `DESCRIPTION:${url}`,
        "END:VEVENT",
        "BEGIN:VEVENT",
        "SUMMARY:晚課修行",
        `DTSTART:${d}T170000`,
        "RRULE:FREQ=DAILY",
        `DESCRIPTION:${url}`,
        "END:VEVENT",
        "END:VCALENDAR"
    ].join("\r\n");
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([ics], {type:'text/calendar'}));
    link.download = 'daily.ics';
    link.click();
};

document.getElementById('reminder-google-btn').onclick = () => {
    const isM = confirm("確定：06:00 / 取消：17:00");
    const t = new Date(); t.setHours(isM ? 6 : 17, 0, 0, 0);
    const fmt = d => d.toISOString().replace(/-|:|\.\d+/g, "");
    window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(isM?"早課":"晚課")}&dates=${fmt(t)}/${fmt(new Date(t.getTime()+900000))}&recur=RRULE:FREQ=DAILY`, '_blank');
};

window.onload = () => {
    Storage.load();
    initResources();
};
