// --- 基礎變數 ---
let count = 0, subCount = 0, autoInterval = null, isRunning = false, isPausing = false;
let lifetimeCount = 0, streakCount = 0, lastPracticeDate = "";

// Web Audio API 核心
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = new AudioContext();
let muyuBuffer = null, qingBuffer = null;

const statusText = document.getElementById('status-text');
const startBtn = document.getElementById('start-btn');
const muyuBtn = document.getElementById('muyu-btn');
const overlay = document.getElementById('force-start-overlay');
const modeSelect = document.getElementById('mode-select');

// 解鎖與載入
async function unlockAndLoad() {
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    overlay.style.opacity = '0';
    setTimeout(() => overlay.style.display = 'none', 500);
    statusText.innerText = "接引音訊中...";

    try {
        const [mBuf, qBuf] = await Promise.all([
            fetch('muyu.mp3').then(r => r.arrayBuffer()).then(ab => audioCtx.decodeAudioData(ab)),
            fetch('bells.mp3').then(r => r.arrayBuffer()).then(ab => audioCtx.decodeAudioData(ab))
        ]);
        muyuBuffer = mBuf;
        qingBuffer = qBuf;
        startBtn.disabled = false;
        statusText.innerText = "道場已就緒";
    } catch (err) {
        statusText.innerText = "載入失敗，請確認檔案名稱";
    }
}

overlay.addEventListener('click', unlockAndLoad);

// 播放與磬聲邏輯
function play(buffer, vol = 1.0) {
    if (!buffer || !audioCtx) return;
    const s = audioCtx.createBufferSource();
    const g = audioCtx.createGain();
    s.buffer = buffer; g.gain.value = vol;
    s.connect(g); g.connect(audioCtx.destination);
    s.start(0);
}

function playWait(buffer) {
    return new Promise(r => {
        play(buffer);
        setTimeout(r, 1200);
    });
}

// 數據管理
const Storage = {
    load: () => {
        lifetimeCount = parseInt(localStorage.getItem('kowtow_total')) || 0;
        streakCount = parseInt(localStorage.getItem('kowtow_streak')) || 0;
        lastPracticeDate = localStorage.getItem('kowtow_date') || "";
        Storage.updateUI();
        if (localStorage.getItem('kowtow_target')) document.getElementById('target-input').value = localStorage.getItem('kowtow_target');
        if (localStorage.getItem('kowtow_speed')) document.getElementById('speed-input').value = localStorage.getItem(STORAGE_KEYS.SPEED);
    },
    save: () => {
        const today = new Date().toDateString();
        if (lastPracticeDate !== today) { streakCount++; lastPracticeDate = today; }
        lifetimeCount++;
        localStorage.setItem('kowtow_total', lifetimeCount);
        localStorage.setItem('kowtow_streak', streakCount);
        localStorage.setItem('kowtow_date', lastPracticeDate);
        Storage.updateUI();
    },
    updateUI: () => {
        document.getElementById('lifetime-counter').innerText = `總計：${lifetimeCount.toLocaleString()}`;
        document.getElementById('streak-counter').innerText = `連續修行：${streakCount} 天`;
    }
};

// 🌟 核心計數處理 (處理 5 下計 1)
function handleCountLogic() {
    const mode = modeSelect.value;
    play(muyuBuffer);

    if (mode === 'recitation') {
        subCount++;
        if (subCount >= 5) {
            count++;
            subCount = 0;
            Storage.save();
            return true; // 代表進度跳了一次
        }
    } else {
        count++;
        Storage.save();
        return true;
    }
    return false;
}

// 自動修行循環
async function perform() {
    if (!isRunning || isPausing) return;
    
    const didIncrement = handleCountLogic();
    if (didIncrement) {
        document.getElementById('counter').innerText = `進度：${count}`;
    }

    // 文字動畫
    const ft = document.getElementById('floating-text');
    ft.classList.remove('animate-text'); void ft.offsetWidth; ft.classList.add('animate-text');

    const target = parseInt(document.getElementById('target-input').value);
    if (count >= target) {
        finishPractice();
        return;
    }

    // 每100下敲一次磬 (叩首部分一樣)
    if (didIncrement && count % 100 === 0) {
        isPausing = true; clearInterval(autoInterval);
        statusText.innerText = `已滿 ${count} 下，鳴磬中...`;
        await playWait(qingBuffer);
        if (isRunning) {
            statusText.innerText = "修行進行中...";
            autoInterval = setInterval(perform, 60000 / parseInt(document.getElementById('speed-input').value));
            isPausing = false;
        }
    }
}

startBtn.onclick = async () => {
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    count = 0; subCount = 0;
    isRunning = true; startBtn.disabled = true;
    statusText.innerText = "鳴磬三聲，靜心...";
    for (let i = 0; i < 3; i++) { if (isRunning) await playWait(qingBuffer); }
    if (isRunning) {
        statusText.innerText = "修行進行中...";
        autoInterval = setInterval(perform, 60000 / parseInt(document.getElementById('speed-input').value));
    }
};

async function finishPractice() {
    isRunning = false; isPausing = false;
    clearInterval(autoInterval);
    statusText.innerText = "目標達成，圓滿迴向中...";
    // 達成目標敲磬三聲
    for (let i = 0; i < 3; i++) { await playWait(qingBuffer); }
    startBtn.disabled = false;
    statusText.innerText = "儀軌圓滿！";
}

document.getElementById('stop-btn').onclick = () => {
    isRunning = false; clearInterval(autoInterval);
    startBtn.disabled = false; statusText.innerText = "已停止";
};

// 🌟 手動敲擊邏輯 (同步支援默念模式)
muyuBtn.onclick = async () => {
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    if (!isRunning && !isPausing) {
        const didIncrement = handleCountLogic();
        if (didIncrement) {
            document.getElementById('counter').innerText = `進度：${count}`;
            // 手動達成目標一樣要敲磬三聲
            const target = parseInt(document.getElementById('target-input').value);
            if (count >= target) {
                finishPractice();
            } else if (count % 100 === 0) {
                play(qingBuffer); // 每100下磬聲
            }
        }
        // 動畫
        const ft = document.getElementById('floating-text');
        ft.classList.remove('animate-text'); void ft.offsetWidth; ft.classList.add('animate-text');
    }
};

document.getElementById('reset-btn').onclick = () => {
    if (confirm("重設所有修行紀錄？")) { localStorage.clear(); location.reload(); }
};

// 提醒功能 (維持原本設定)
document.getElementById('rem-apple').onclick = () => {
    const d = new Date().toISOString().replace(/-|:|\.\d+/g, "").split("T")[0];
    const ics = [
        "BEGIN:VCALENDAR", "VERSION:2.0",
        "BEGIN:VEVENT", "SUMMARY:早課修行", `DTSTART:${d}T060000`, "RRULE:FREQ=DAILY", `DESCRIPTION:${window.location.href}`, "END:VEVENT",
        "BEGIN:VEVENT", "SUMMARY:晚課修行", `DTSTART:${d}T170000`, "RRULE:FREQ=DAILY", `DESCRIPTION:${window.location.href}`, "END:VEVENT",
        "END:VCALENDAR"
    ].join("\r\n");
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([ics], {type:'text/calendar'}));
    link.download = 'kowtow_daily.ics'; link.click();
};

document.getElementById('rem-google').onclick = () => {
    const isM = confirm("確定:06:00 / 取消:17:00");
    const t = new Date(); t.setHours(isM ? 6 : 17, 0, 0, 0);
    const fmt = d => d.toISOString().replace(/-|:|\.\d+/g, "");
    window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(isM?"早課":"晚課")}&dates=${fmt(t)}/${fmt(new Date(t.getTime()+900000))}&recur=RRULE:FREQ=DAILY`, '_blank');
};

window.onload = Storage.load;
