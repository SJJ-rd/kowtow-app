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
      stopBtn = document.getElementById('stop-btn'),
      thousandBtn = document.getElementById('thousand-btn'),
      guianBtn = document.getElementById('guian-btn'), // 🌟
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
        thousandBtn.disabled = false;
        guianBtn.disabled = false; // 🌟
    } catch (e) { console.log("資源載入中..."); }
}
overlay.addEventListener('click', handleEntry);

function play(buffer, vol = 1.0) {
    if (!buffer || !audioCtx) return;
    const s = audioCtx.createBufferSource();
    const g = audioCtx.createGain();
    s.buffer = buffer; g.gain.value = vol;
    s.connect(g); g.connect(audioCtx.destination);
    s.start(0);
}

// 🌟 3秒餘音重疊
function playWait(buffer) {
    return new Promise(resolve => {
        play(buffer);
        const overlap = 3.0; 
        const delay = (buffer.duration > overlap) ? (buffer.duration - overlap) * 1000 : 100;
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
                isPausing = true; play(qingBuffer);
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
    autoTimer = setTimeout(() => {
        const result = handleCount('auto');
        let target = (goalTypeSelect.value === 'count') ? parseInt(document.getElementById('target-count').value) : 0;
        if (target > 0 && count >= target) { finish(); return; }
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
            const m = Math.floor(secondsRemaining / 60).toString().padStart(2, '0'), s = (secondsRemaining % 60).toString().padStart(2, '0');
            timerClock.innerText = `${m}:${s}`;
            if (secondsRemaining <= 0) finish();
        } else {
            secondsElapsed++;
            const m = Math.floor(secondsElapsed / 60).toString().padStart(2, '0'), s = (secondsElapsed % 60).toString().padStart(2, '0');
            timerClock.innerText = `${m}:${s}`;
        }
    }, 1000);
}

async function startPractice() {
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    count = 0; subCount = 0; isRunning = true; 
    startBtn.disabled = true; thousandBtn.disabled = true; guianBtn.disabled = true;
    silentAudio.play().catch(()=>{});
    for (let i = 0; i < 3; i++) { if(!isRunning) return; await playWait(qingBuffer); }
    if (isRunning) { startTimer(); scheduleNextTap(); }
}

startBtn.onclick = startPractice;

thousandBtn.onclick = () => {
    goalTypeSelect.value = 'count';
    document.getElementById('target-count').value = 1000;
    speedInput.value = 100;
    modeSelect.value = 'standard';
    updateUIForAuto();
    startPractice();
};

// 🌟 一鍵跪安模式邏輯
guianBtn.onclick = () => {
    goalTypeSelect.value = 'count';
    document.getElementById('target-count').value = 10; // 跪安 10 次
    speedInput.value = 60; // 60 BPM (一秒一下)
    modeSelect.value = 'recitation'; // 5:1 模式
    
    updateUIForAuto();
    startPractice();
};

function updateUIForAuto() {
    const isTime = goalTypeSelect.value === 'time';
    document.getElementById('goal-time-input').style.display = isTime ? 'block' : 'none';
    document.getElementById('goal-count-input').style.display = isTime ? 'none' : 'block';
    timerLabel.innerText = "已修持時間";
    timerClock.innerText = "00:00";
}

async function finish() {
    isRunning = false; clearTimeout(autoTimer); clearInterval(timerInterval);
    for (let i = 0; i < 3; i++) { await playWait(qingBuffer); }
    startBtn.disabled = false; thousandBtn.disabled = false; guianBtn.disabled = false;
    silentAudio.pause();
}

stopBtn.onclick = () => {
    isRunning = false; isPausing = false; clearTimeout(autoTimer); clearInterval(timerInterval);
    startBtn.disabled = false; thousandBtn.disabled = false; guianBtn.disabled = false;
    silentAudio.pause();
};

muyuBtn.onclick = () => {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    handleCount('manual');
    const ft = document.getElementById('float-muyu');
    ft.classList.remove('animate-up'); void ft.offsetWidth; ft.classList.add('animate-up');
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
