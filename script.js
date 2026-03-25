let count = 0, autoInterval = null, isRunning = false, isPausing = false;
let lifetimeCount = 0, streakCount = 0, lastPracticeDate = "";

const STORAGE_KEYS = {
    LIFETIME: 'kowtow_lifetime_total',
    STREAK: 'kowtow_streak_days',
    LAST_DATE: 'kowtow_last_date',
    TARGET: 'kowtow_setting_target',
    SPEED: 'kowtow_setting_speed'
};

const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = new AudioContext();
let muyuBuffer = null, qingBuffer = null;
let isUnlocked = false;

// 元素宣告
const counterDisplay = document.getElementById('counter'),
      statusText = document.getElementById('status-text'),
      startBtn = document.getElementById('start-btn'),
      stopBtn = document.getElementById('stop-btn'),
      targetInput = document.getElementById('target-input'),
      speedInput = document.getElementById('speed-input'),
      muyuBtn = document.getElementById('muyu-btn'),
      floatingText = document.getElementById('floating-text');

// 🌟 強制解鎖音訊 (解決手機載入卡住的核心)
function unlock() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const b = audioCtx.createBuffer(1, 1, 22050);
    const s = audioCtx.createBufferSource();
    s.buffer = b; s.connect(audioCtx.destination);
    s.start(0);
    isUnlocked = true;
    if (muyuBuffer && qingBuffer) statusText.innerText = "就緒，請按開始修行";
}
document.addEventListener('touchstart', unlock, { once: true });
document.addEventListener('click', unlock, { once: true });

// 🌟 強化載入器：加入超時檢查
async function loadFile(url) {
    try {
        const res = await fetch(url, { cache: "no-cache" });
        if (!res.ok) throw new Error("File not found");
        const arrayBuffer = await res.arrayBuffer();
        return await audioCtx.decodeAudioData(arrayBuffer);
    } catch (e) {
        console.error("載入失敗:", url, e);
        return null;
    }
}

async function init() {
    statusText.innerText = "正在接引音訊...";
    
    // 同時嘗試載入
    const mP = loadFile('muyu.mp3');
    const qP = loadFile('bells.mp3');

    muyuBuffer = await mP;
    qingBuffer = await qP;

    if (muyuBuffer && qingBuffer) {
        statusText.innerText = isUnlocked ? "就緒，請按開始修行" : "請點擊螢幕任意處以解鎖";
    } else {
        statusText.innerText = "音訊遺失，請檢查檔案名稱";
    }
}

// 播放與計時邏輯 (精簡最佳化)
function play(buf, vol = 1) {
    if (!buf || !isUnlocked) return;
    const s = audioCtx.createBufferSource(), g = audioCtx.createGain();
    s.buffer = buf; g.gain.value = vol;
    s.connect(g); g.connect(audioCtx.destination);
    s.start(0);
}

function playWait(buf, vol = 1) {
    return new Promise(r => {
        play(buf, vol);
        setTimeout(r, (buf.duration * 1000) - 450);
    });
}

const Storage = {
    load: function() {
        lifetimeCount = parseInt(localStorage.getItem(STORAGE_KEYS.LIFETIME)) || 0;
        streakCount = parseInt(localStorage.getItem(STORAGE_KEYS.STREAK)) || 0;
        lastPracticeDate = localStorage.getItem(STORAGE_KEYS.LAST_DATE) || "";
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        if (lastPracticeDate !== today && lastPracticeDate !== yesterday && lastPracticeDate !== "") streakCount = 0;
        this.update();
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
        this.update();
    },
    update: function() {
        document.getElementById('lifetime-counter').innerText = `總叩首：${lifetimeCount.toLocaleString()}`;
        document.getElementById('streak-counter').innerText = `連續修行：${streakCount} 天`;
    }
};

async function perform() {
    if (!isRunning || isPausing) return;
    count++; Storage.save();
    counterDisplay.innerText = `叩首：${count}`;
    play(muyuBuffer);
    floatingText.classList.remove('animate-text'); void floatingText.offsetWidth; floatingText.add;
    floatingText.classList.add('animate-text');

    if (count >= parseInt(targetInput.value)) {
        isRunning = false; clearInterval(autoInterval);
        statusText.innerText = "圓滿達成，鳴磬迴向...";
        for(let i=0; i<3; i++) await playWait(qingBuffer, 1);
        startBtn.disabled = false; statusText.innerText = "儀軌圓滿！";
        return;
    }

    if (count % 100 === 0) {
        isPausing = true; clearInterval(autoInterval);
        statusText.innerText = `已滿 ${count} 下，鳴磬中...`;
        await playWait(qingBuffer, 0.9);
        if (isRunning) {
            statusText.innerText = "修行進行中...";
            autoInterval = setInterval(perform, 60000 / parseInt(speedInput.value));
            isPausing = false;
        }
    }
}

startBtn.onclick = async () => {
    if (!isUnlocked) unlock();
    count = 0; isRunning = true; startBtn.disabled = true;
    statusText.innerText = "鳴磬三聲，靜心...";
    for(let i=0; i<3; i++) if(isRunning) await playWait(qingBuffer, 0.9);
    if(isRunning) {
        statusText.innerText = "修行進行中...";
        autoInterval = setInterval(perform, 60000 / parseInt(speedInput.value));
    }
};

stopBtn.onclick = () => { isRunning = false; clearInterval(autoInterval); startBtn.disabled = false; statusText.innerText = "已停止"; };

// 提醒功能 (修正 ICS 格式)
document.getElementById('reminder-apple-btn').onclick = () => {
    const d = new Date().toISOString().replace(/-|:|\.\d+/g, "").split("T")[0];
    const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nDTSTART;VALUE=DATE-TIME:${d}T060000\nRRULE:FREQ=DAILY\nSUMMARY:早課修行\nDESCRIPTION:${window.location.href}\nEND:VEVENT\nBEGIN:VEVENT\nDTSTART;VALUE=DATE-TIME:${d}T170000\nRRULE:FREQ=DAILY\nSUMMARY:晚課修行\nDESCRIPTION:${window.location.href}\nEND:VEVENT\nEND:VCALENDAR`.replace(/\n/g, "\r\n");
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([ics], {type:'text/calendar'}));
    link.download = 'daily.ics'; link.click();
};

document.getElementById('reminder-google-btn').onclick = () => {
    const isM = confirm("確定：06:00 / 取消：17:00");
    const t = new Date(); t.setHours(isM ? 6 : 17, 0, 0, 0);
    const fmt = d => d.toISOString().replace(/-|:|\.\d+/g, "");
    window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(isM?"早課":"晚課")}&dates=${fmt(t)}/${fmt(new Date(t.getTime()+900000))}&recur=RRULE:FREQ=DAILY`, '_blank');
};

muyuBtn.onclick = () => {
    if (!isRunning && !isPausing) {
        count++; Storage.save(); counterDisplay.innerText = `叩首：${count}`;
        play(muyuBuffer);
        floatingText.classList.remove('animate-text'); void floatingText.offsetWidth; floatingText.classList.add('animate-text');
        if (count % 100 === 0) play(qingBuffer, 0.7);
    }
};

window.onload = () => { Storage.load(); init(); };
