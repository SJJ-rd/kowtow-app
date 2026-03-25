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

const counterDisplay = document.getElementById('counter'),
      statusText = document.getElementById('status-text'),
      startBtn = document.getElementById('start-btn'),
      stopBtn = document.getElementById('stop-btn'),
      targetInput = document.getElementById('target-input'),
      speedInput = document.getElementById('speed-input'),
      muyuBtn = document.getElementById('muyu-btn'),
      floatingText = document.getElementById('floating-text');

// 🌟 解鎖音訊
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

// 🌟 分段載入：解決大檔案載入很久的問題
async function loadFile(url, name) {
    try {
        const res = await fetch(url);
        const arrayBuffer = await res.arrayBuffer();
        return await audioCtx.decodeAudioData(arrayBuffer);
    } catch (e) {
        console.error(name + " 載入失敗");
        return null;
    }
}

async function init() {
    statusText.innerText = "接引音訊中 (大檔案請稍候)...";
    // 木魚先載，載完就能點
    loadFile('muyu.mp3', '木魚').then(buf => {
        muyuBuffer = buf;
        if(qingBuffer) statusText.innerText = "就緒，請按開始修行";
    });
    // 引磬後載
    loadFile('bells.mp3', '引磬').then(buf => {
        qingBuffer = buf;
        if(muyuBuffer) statusText.innerText = "就緒，請按開始修行";
    });
}

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
    floatingText.classList.remove('animate-text'); void floatingText.offsetWidth;
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

// 🌟 Apple 提醒：修正為標準多行格式 (解決不是每日的問題)
document.getElementById('reminder-apple-btn').onclick = () => {
    const url = window.location.href;
    const now = new Date();
    const pad = n => n < 10 ? '0' + n : n;
    const d = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}`;

    const icsContent = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "BEGIN:VEVENT",
        "SUMMARY:早課修行",
        `DTSTART:${d}T060000`,
        `DTEND:${d}T061500`,
        "RRULE:FREQ=DAILY",
        `DESCRIPTION:${url}`,
        "END:VEVENT",
        "BEGIN:VEVENT",
        "SUMMARY:晚課修行",
        `DTSTART:${d}T170000`,
        `DTEND:${d}T171500`,
        "RRULE:FREQ=DAILY",
        `DESCRIPTION:${url}`,
        "END:VEVENT",
        "END:VCALENDAR"
    ].join("\r\n");

    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([icsContent], {type:'text/calendar'}));
    link.download = 'daily.ics';
    link.click();
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
