const API_URL = "https://rise-app-vcsk.onrender.com";

let token = localStorage.getItem("rise_token");
let timerInterval = null;
let timeLeft = 25 * 60;
let isTimerRunning = false;

// Audio Synth State (Web Audio API - Pure JS Ambient Generator)
let audioCtx = null;
let activeNoiseNode = null;
let activeNoiseType = null;

window.onload = () => {
    if (token) {
        showDashboard();
    }
};

function changeTheme(themeName) {
    document.body.className = `${themeName} min-h-screen font-sans`;
    localStorage.setItem("rise_theme", themeName);
}

async function register() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    if (!email || !password) return alert("Enter credentials");

    const res = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
    });
    if (res.ok) alert("Registered successfully! Now log in.");
    else alert("Registration failed.");
}

async function login() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    if (!email || !password) return alert("Enter credentials");

    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);

    const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData
    });

    if (res.ok) {
        const data = await res.json();
        token = data.access_token;
        localStorage.setItem("rise_token", token);
        showDashboard();
    } else {
        alert("Invalid login");
    }
}

function logout() {
    localStorage.removeItem("rise_token");
    token = null;
    stopNoise();
    document.getElementById("auth-card").classList.remove("hidden");
    document.getElementById("dashboard").classList.add("hidden");
}

function showDashboard() {
    document.getElementById("auth-card").classList.add("hidden");
    document.getElementById("dashboard").classList.remove("hidden");
    
    const savedTheme = localStorage.getItem("rise_theme") || "theme-amber";
    document.getElementById("theme-selector").value = savedTheme;
    changeTheme(savedTheme);

    refreshAllData();
    fetchQuote();
    setInterval(refreshAllData, 10000);
}

function refreshAllData() {
    fetchUserData();
    fetchTasks();
    fetchHabits();
}

async function fetchQuote() {
    try {
        const res = await fetch(`${API_URL}/quotes/random`);
        if (res.ok) {
            const data = await res.json();
            document.getElementById("quote-container").innerText = `"${data.quote}" — ${data.author}`;
        }
    } catch (e) {}
}

async function fetchUserData() {
    const res = await fetch(`${API_URL}/users/me`, {
        headers: { "Authorization": `Bearer ${token}` }
    });
    if (res.status === 401) return logout();
    if (res.ok) {
        const user = await res.json();
        document.getElementById("user-display-email").innerText = user.email.split("@")[0];
        document.getElementById("user-avatar").innerText = user.email.charAt(0).toUpperCase();
        document.getElementById("user-points").innerText = user.points;
        document.getElementById("user-xp").innerText = user.xp;

        // Level & Progress Bar Logic (100 XP per Level)
        const level = Math.floor(user.xp / 100) + 1;
        const currentLevelProgress = user.xp % 100;
        document.getElementById("user-level").innerText = level;
        document.getElementById("level-bar").style.width = `${currentLevelProgress}%`;
    }
}

async function fetchTasks() {
    const res = await fetch(`${API_URL}/tasks`, {
        headers: { "Authorization": `Bearer ${token}` }
    });
    if (res.ok) {
        const tasks = await res.json();
        const list = document.getElementById("task-list");
        list.innerHTML = "";
        tasks.forEach(task => {
            const priorityColors = {
                low: "bg-blue-950 text-blue-300 border-blue-800",
                medium: "bg-amber-950 text-amber-300 border-amber-800",
                high: "bg-red-950 text-red-300 border-red-800"
            };
            const li = document.createElement("li");
            li.className = "flex justify-between items-center p-3.5 bg-gray-900 border border-gray-800 rounded-xl text-sm";
            li.innerHTML = `
                <div class="flex items-center gap-3">
                    <span class="text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${priorityColors[task.priority] || priorityColors.medium}">${task.priority}</span>
                    <span class="${task.completed ? 'line-through text-gray-500' : 'text-gray-200'}">${task.title}</span>
                </div>
                <button onclick="deleteTask(${task.id})" class="text-gray-600 hover:text-red-400 font-bold px-2">✕</button>
            `;
            list.appendChild(li);
        });
    }
}

async function createTask() {
    const titleInput = document.getElementById("task-title");
    const prioritySelect = document.getElementById("task-priority");
    const title = titleInput.value;
    if (!title) return;

    const res = await fetch(`${API_URL}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ title, priority: prioritySelect.value, points_value: 10 })
    });
    if (res.ok) {
        titleInput.value = "";
        fetchTasks();
    }
}

async function deleteTask(id) {
    const res = await fetch(`${API_URL}/tasks/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
    });
    if (res.ok) fetchTasks();
}

async function fetchHabits() {
    const res = await fetch(`${API_URL}/habits`, {
        headers: { "Authorization": `Bearer ${token}` }
    });
    if (res.ok) {
        const habits = await res.json();
        const list = document.getElementById("habit-list");
        list.innerHTML = "";
        habits.forEach(habit => {
            const li = document.createElement("li");
            li.className = "flex justify-between items-center p-3 bg-gray-900 border border-gray-800 rounded-xl text-xs";
            li.innerHTML = `
                <span class="text-gray-200">${habit.title}</span>
                <span class="text-amber-400 font-bold">🔥 ${habit.current_streak} days</span>
            `;
            list.appendChild(li);
        });
    }
}

async function createHabit() {
    const input = document.getElementById("habit-title");
    if (!input.value) return;

    const res = await fetch(`${API_URL}/habits`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ title: input.value, frequency: "daily" })
    });
    if (res.ok) {
        input.value = "";
        fetchHabits();
    }
}

function toggleTimer() {
    const btn = document.getElementById("timer-btn");
    if (isTimerRunning) {
        clearInterval(timerInterval);
        isTimerRunning = false;
        btn.innerText = "Resume Focus";
        btn.className = "w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition";
    } else {
        isTimerRunning = true;
        btn.innerText = "Pause Timer";
        btn.className = "w-1/2 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-sm transition";
        timerInterval = setInterval(() => {
            if (timeLeft > 0) {
                timeLeft--;
                updateTimerDisplay();
            } else {
                clearInterval(timerInterval);
                completeSession();
            }
        }, 1000);
    }
}

function resetTimer() {
    clearInterval(timerInterval);
    isTimerRunning = false;
    timeLeft = 25 * 60;
    updateTimerDisplay();
    document.getElementById("timer-btn").innerText = "Start Focus";
    document.getElementById("timer-btn").className = "w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition";
}

function updateTimerDisplay() {
    const mins = Math.floor(timeLeft / 60).toString().padStart(2, '0');
    const secs = (timeLeft % 60).toString().padStart(2, '0');
    document.getElementById("timer-display").innerText = `${mins}:${secs}`;
}

async function completeSession() {
    alert("Focus session complete! +50 XP");
    await fetch(`${API_URL}/focus/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ duration_minutes: 25 })
    });
    resetTimer();
    refreshAllData();
}

// --- Synthesized Ambient Audio Generator (No External Files Required) ---
function toggleNoise(type) {
    if (activeNoiseType === type) {
        stopNoise();
        return;
    }
    stopNoise();
    
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    const bufferSize = audioCtx.sampleRate * 2;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = audioCtx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const filter = audioCtx.createBiquadFilter();
    filter.type = type === 'rain' ? 'lowpass' : 'bandpass';
    filter.frequency.value = type === 'rain' ? 800 : 1200;

    const gainNode = audioCtx.createGain();
    gainNode.gain.value = 0.05;

    whiteNoise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    whiteNoise.start();
    activeNoiseNode = whiteNoise;
    activeNoiseType = type;

    document.getElementById(`${type}-btn`).classList.add("border-amber-500", "text-amber-400");
}

function stopNoise() {
    if (activeNoiseNode) {
        activeNoiseNode.stop();
        activeNoiseNode = null;
        activeNoiseType = null;
        document.getElementById("noise-btn").classList.remove("border-amber-500", "text-amber-400");
        document.getElementById("white-btn").classList.remove("border-amber-500", "text-amber-400");
    }
}
