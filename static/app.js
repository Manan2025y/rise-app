// Pointing directly to your live Render domain
const API_URL = "https://rise-app-vcsk.onrender.com";

let token = localStorage.getItem("rise_token");

window.onload = () => {
    if (token) {
        showDashboard();
    }
};

async function register() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    if (!email || !password) {
        alert("Please enter both email and password.");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        if (res.ok) {
            alert("Registration successful! You can now log in.");
        } else {
            const data = await res.json();
            alert(data.detail || "Registration failed");
        }
    } catch (err) {
        alert("Server error. Render may take 30 seconds to wake up.");
    }
}

async function login() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    if (!email || !password) {
        alert("Please enter both email and password.");
        return;
    }

    try {
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
            alert("Invalid credentials");
        }
    } catch (err) {
        alert("Server connection error.");
    }
}

function logout() {
    localStorage.removeItem("rise_token");
    token = null;
    document.getElementById("auth-card").classList.remove("hidden");
    document.getElementById("task-card").classList.add("hidden");
    document.getElementById("auth-status").innerText = "Not logged in";
}

function showDashboard() {
    document.getElementById("auth-card").classList.add("hidden");
    document.getElementById("task-card").classList.remove("hidden");
    document.getElementById("auth-status").innerText = "Logged In";
    fetchTasks();
    setInterval(fetchTasks, 5000);
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
            const li = document.createElement("li");
            li.className = "flex justify-between items-center p-3 bg-gray-900 border border-gray-700 rounded";
            li.innerHTML = `
                <span class="${task.completed ? 'line-through text-gray-500' : 'text-gray-200'}">${task.title}</span>
                <button onclick="deleteTask(${task.id})" class="text-red-400 hover:text-red-600 font-bold px-2">✕</button>
            `;
            list.appendChild(li);
        });
    }
}

async function createTask() {
    const titleInput = document.getElementById("task-title");
    const title = titleInput.value;
    if (!title) return;

    const res = await fetch(`${API_URL}/tasks`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ title, description: "", points: 10, completed: false })
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

    if (res.ok) {
        fetchTasks();
    }
}