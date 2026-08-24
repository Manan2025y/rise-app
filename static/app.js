const API_URL = "https://rise-app-vcsk.onrender.com";

let token = localStorage.getItem("rise_token");
let timerInterval = null;
let timeLeft = 25 * 60;
let isTimerRunning = false;

window.onload = () => {
    if (token) {
        showDashboard();
    }
};

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
    document.getElementById("auth-card").classList.remove("hidden");
    document.getElementById("dashboard").classList.add("hidden");
}

function showDashboard() {
    document.getElementById("auth-card").classList.add("hidden");
    document.getElementById("dashboard").classList.remove("hidden");
    refreshAllData();
    setInterval(refreshAllData, 5000);
}

function refreshAllData() {
    fetchUserData();
    fetchTasks();
    fetchHabits();
}

async function fetchUserData() {
    const res = await fetch(`${API_URL}/tasks`, {
        headers: { "Authorization": `Bearer ${token}` }
    });
    if (res.status === 401) logout();
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
            const priorityColors = { low: "bg-blue-900 text-blue-300", medium: "bg-yellow-900 text-yellow-300", high: "bg-red-900 text-red-300" };
            const li = document.createElement("li");
            li.className = "flex justify-between items-center p-3 bg-gray-800 border border-gray-700 rounded-lg";
            li.innerHTML = `
                <div class="flex items-center gap-3">
                    <span class="text-xs px-2 py-1 rounded font-semibold ${priorityColors[task.priority] || priorityColors.medium}">${task.priority}</span>
                    <span class="${task.completed ? 'line-through text-gray-500' : 'text-gray-200'}">${task.title}</span>
                </div>
                <button onclick="deleteTask(${task.id})" class="text-gray-500 hover:text-red-400 font-bold px-2">✕</button>
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
            li.className = "flex justify-between items-center p-2 bg-gray-800 border border-gray-700 rounded text-sm";
            li.innerHTML = `
                <span class="text-gray-200">${habit.title}</span>
                <span class="text-xs text-amber-400 font-bold">🔥 ${habit.current_streak} d</span>
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
        btn.className = "w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded";
    } else {
        isTimerRunning = true;
        btn.innerText = "Pause Timer";
        btn.className = "w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded";
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
    timeLeft = 25 * 60;
    updateTimerDisplay();
    refreshAllData();
}
