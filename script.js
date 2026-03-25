// 🌟 Google 提醒 (強化每日重複版)
document.getElementById('reminder-google-btn').addEventListener('click', () => {
    const isMorning = confirm("【設定每日提醒】\n確定：每天早上 06:00\n取消：每天下午 17:00");
    const appUrl = window.location.href;
    
    // 設定時間
    const now = new Date();
    const startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), isMorning ? 6 : 17, 0, 0);
    const endTime = new Date(startTime.getTime() + 30 * 60000); // 持續 30 分鐘

    const pad = n => n < 10 ? '0' + n : n;
    const fmt = d => `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;

    const title = encodeURIComponent(isMorning ? "早課修行：叩首" : "晚課修行：叩首");
    const details = encodeURIComponent(`該精下心來修行了。\n點擊進入連結：\n${appUrl}`);
    
    // 關鍵：RRULE:FREQ=DAILY 確保每天重複
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&dates=${fmt(startTime)}/${fmt(endTime)}&recur=RRULE:FREQ=DAILY&sf=true&output=xml`;
    
    window.location.href = url; // 改用直接跳轉，減少被攔截機率
});

// 🌟 Apple 提醒 (強化每日重複 .ics 版)
document.getElementById('reminder-apple-btn').addEventListener('click', () => {
    const appUrl = window.location.href;
    const now = new Date();
    const pad = n => n < 10 ? '0' + n : n;
    const fmt = d => `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
    
    // 建立早上 6 點與下午 5 點的時間物件
    const mStart = `${pad(now.getFullYear())}${pad(now.getMonth()+1)}${pad(now.getDate())}T060000`;
    const mEnd   = `${pad(now.getFullYear())}${pad(now.getMonth()+1)}${pad(now.getDate())}T063000`;
    const eStart = `${pad(now.getFullYear())}${pad(now.getMonth()+1)}${pad(now.getDate())}T170000`;
    const eEnd   = `${pad(now.getFullYear())}${pad(now.getMonth()+1)}${pad(now.getDate())}T173000`;

    // 嚴格遵守 ICS 格式，加入 RRULE:FREQ=DAILY
    const icsContent = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//KowtowDaily//NONSGML v1.0//EN",
        "BEGIN:VEVENT",
        `UID:morning-${Date.now()}@muyu.app`,
        `DTSTAMP:${fmt(now)}`,
        `DTSTART:${mStart}`,
        `DTEND:${mEnd}`,
        "RRULE:FREQ=DAILY", // 每天重複
        "SUMMARY:早課修行：叩首",
        `DESCRIPTION:該修行了。網址：${appUrl}`,
        "BEGIN:VALARM",
        "TRIGGER:-PT0M",
        "ACTION:DISPLAY",
        "END:VALARM",
        "END:VEVENT",
        "BEGIN:VEVENT",
        `UID:evening-${Date.now()}@muyu.app`,
        `DTSTAMP:${fmt(now)}`,
        `DTSTART:${eStart}`,
        `DTEND:${eEnd}`,
        "RRULE:FREQ=DAILY", // 每天重複
        "SUMMARY:晚課修行：叩首",
        `DESCRIPTION:該修行了。網址：${appUrl}`,
        "BEGIN:VALARM",
        "TRIGGER:-PT0M",
        "ACTION:DISPLAY",
        "END:VALARM",
        "END:VEVENT",
        "END:VCALENDAR"
    ].join("\r\n");

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    // 觸發下載
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'kowtow_daily.ics');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});
