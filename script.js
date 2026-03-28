let count = 0, subCount = 0, isRunning = false, isPausing = false;
let lifetimeCount = 0;
let autoTimer = null, timerInterval = null;
let secondsRemaining = 0, secondsElapsed = 0;

const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = new AudioContext();
let muyuBuffer = null, qingBuffer = null;

const timerClock = document.getElementById('timer-clock'),
      timerLabel = document.getElementById('timer-label'),
      counterDisplay = document.getElementById('counter'),
      startBtn = document.getElementById('start-btn'),
      muyuBtn = document.getElementById('muyu-btn'),
      qingBtn = document.getElementById('qing-btn'),
      overlay = document.getElementById('force-start-overlay'),
      modeSelect = document.getElementById('mode-select'),
      goalTypeSelect = document.getElementById('goal-type'),
      speedInput = document.getElementById('speed-input');

goalTypeSelect.addEventListener('change', function() {
    const isTime = this.value === 'time';
    document.getElementById('goal-time-input').style.display = isTime ? 'block' : 'none';
    document.getElementById('goal-count-input').style.display = isTime ? 'none' : 'block';
    timerLabel.innerText = isTime ? "修行倒數" : "已修持時間";
    timerClock.innerText = isTime ? document.getElementById('target-time').value + ":00" : "00:00";
});

const silentAudio = new Audio();
silentAudio.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YQAAAAA=";
silentAudio.loop = true;

async function handleEntry() {
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    overlay.style.display = 'none';
    try {
        const ver = Date.now();
        const [mAB, qAB] = await Promise.all([
            fetch(`muyu.mp3?v=${ver}`).then(r => r.arrayBuffer()),
            fetch(`bells.mp3?v=${ver}`).then(r => r.arrayBuffer())
        ]);
        muyuBuffer = await audioCtx.decodeAudioData(mAB);
        qingBuffer = await audioCtx.decodeAudioData(qAB);
        startBtn.disabled = false;
    } catch (e) { alert("音訊載入失敗"); }
}
overlay.addEventListener('click', handleEntry);

function play(buffer, vol = 1.0) {
    if (!buffer || !audioCtx) return;
    const source = audioCtx.createBufferSource();
    const gainNode = audioCtx.createGain();
    source.buffer = buffer; 
    gainNode.gain.value = vol;
    source.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    source.start(0);
}

// 🌟 核心參數：3.0 秒餘音銜接
function playWait(buffer) {
    return new Promise(resolve => {
        play(buffer);
        const overlapSeconds = 3.0; 
        const delay = (buffer.duration > overlapSeconds) ? (buffer.duration - overlapSeconds) * 1000 : 100;
        setTimeout(resolve, delay);
    });
}

function handleCount(source = 'auto') {
    const mode = modeSelect.value;
    play(muyuBuffer);
    let incremented = false;
    if (mode === 'recitation') {
        subCount++;
        if (subCount >= 5) { subCount = 0; count++; incremented = true; }
    } else {
        count++; incremented = true;
    }
    if (incremented) {
        counterDisplay.innerText = `本次進度：${count}`;
        saveData();
        if (mode === 'standard' && count % 100 === 0) {
            if (source === 'auto') {
                isPausing = true;
                play(qingBuffer);
                setTimeout(() => { if (isRunning) { isPausing = false; scheduleNextTap(); } }, 1500);
                return 'paused'; 
            } else { play(qingBuffer); }
        }
    }
    return incremented;
}

function scheduleNextTap() {
    if (!isRunning || isPausing) return;
    const bpm = parseInt(speedInput.value) || 60;
    const interval = 60000 / bpm;
    autoTimer = setTimeout(async () => {
        const result = handleCount('auto');
        if (goalTypeSelect.value === 'count' && count >= parseInt(document.getElementById('target-count').value)) {
            finish(); return;
        }
        if (result !== 'paused' && isRunning) scheduleNextTap();
    }, interval);
}

function startTimer() {
    secondsElapsed = 0;
    secondsRemaining = parseInt(document.getElementById('target-time').value) * 60;
    timerInterval = setInterval(() => {
        if (!isRunning || isPausing) return;
        if (goalTypeSelect.value === 'time') {
            secondsRemaining--;
            const m = Math.floor(secondsRemaining / 60).toString().padStart(2, '0');
            const s = (secondsRemaining % 60).toString().padStart(2, '0');
            timerClock.innerText = `${m}:${s}`;
            if (secondsRemaining <= 0) finish();
        } else {
            secondsElapsed++;
            const m = Math.floor(secondsElapsed / 60).toString().padStart(2, '0');
            const s = (secondsElapsed % 60).toString().padStart(2, '0');
            timerClock.innerText = `${m}:${s}`;
        }
    }, 1000);
}

startBtn.onclick = async () => {
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    count = 0; subCount = 0; isRunning = true; startBtn.disabled = true;
    silentAudio.play().catch(()=>{});
    for (let i = 0; i < 3; i++) { if(!isRunning) return; await playWait(qingBuffer); }
    if (isRunning) { startTimer(); scheduleNextTap(); }
};

async function finish() {
    isRunning = false; clearTimeout(autoTimer); clearInterval(timerInterval);
    for (let i = 0; i < 3; i++) { await playWait(qingBuffer); }
    startBtn.disabled = false; silentAudio.pause();
}

document.getElementById('stop-btn').onclick = () => {
    isRunning = false; isPausing = false; clearTimeout(autoTimer); clearInterval(timerInterval);
    startBtn.disabled = false; silentAudio.pause();
};

muyuBtn.onclick = () => {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    handleCount('manual');
    const ft = document.getElementById('float-muyu');
    ft.classList.remove('animate-up'); void ft.offsetWidth; ft.classList.add('animate-up');
    if (goalTypeSelect.value === 'count' && count >= parseInt(document.getElementById('target-count').value)) finish();
};

qingBtn.onclick = () => {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    play(qingBuffer);
    const ft = document.getElementById('float-qing');
    ft.classList.remove('animate-up'); void ft.offsetWidth; ft.classList.add('animate-up');
};

function saveData() {
    lifetimeCount++;
    localStorage.setItem('kowtow_total', lifetimeCount);
    document.getElementById('lifetime-counter').innerText = `累計進度：${lifetimeCount.toLocaleString()}`;
}

window.onload = () => {
    lifetimeCount = parseInt(localStorage.getItem('kowtow_total')) || 0;
    document.getElementById('lifetime-counter').innerText = `累計進度：${lifetimeCount.toLocaleString()}`;
};
