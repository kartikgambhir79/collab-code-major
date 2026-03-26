<?php
session_start();
if (isset($_SESSION['user_id'])) {
    header("Location: dashboard.php");
    exit();
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>College Coding Collaboration Platform</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Inter', sans-serif; background-color: #0f172a; color: white; }
        .glass { background: rgba(30, 41, 59, 0.7); backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.1); }
        .grad-text { background: linear-gradient(to right, #3b82f6, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    </style>
</head>
<body class="min-h-screen flex items-center justify-center relative overflow-hidden">
    <!-- Background Decor -->
    <div class="absolute w-96 h-96 bg-blue-500 rounded-full blur-[128px] opacity-20 top-0 left-0"></div>
    <div class="absolute w-96 h-96 bg-purple-500 rounded-full blur-[128px] opacity-20 bottom-0 right-0"></div>

    <div class="glass p-8 rounded-2xl shadow-2xl w-full max-w-md relative z-10 transition-all duration-300 hover:shadow-blue-500/20">
        <div class="text-center mb-8">
            <h1 class="text-3xl font-bold grad-text mb-2">CollabCode</h1>
            <p class="text-slate-400">Join the ultimate college coding platform</p>
        </div>

        <!-- Auth Form -->
        <form id="auth-form" onsubmit="handleAuth(event)">
            <input type="hidden" id="action" name="action" value="login">
            
            <div id="error-message" class="hidden bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg mb-4 text-sm text-center"></div>

            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-slate-300 mb-1">Username</label>
                    <input type="text" id="username" name="username" class="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" required placeholder="Enter your unique username">
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-slate-300 mb-1">Password</label>
                    <input type="password" id="password" name="password" class="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" required placeholder="••••••••">
                </div>
            </div>

            <button type="submit" class="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold py-3 px-4 rounded-lg mt-6 shadow-lg transform transition hover:-translate-y-0.5">
                <span id="btn-text">Sign In</span>
            </button>
        </form>

        <div class="mt-6 text-center text-sm text-slate-400">
            <p id="toggle-text">Don't have an account? 
                <button onclick="toggleMode()" class="text-blue-400 hover:text-blue-300 font-medium transition-colors">Sign up</button>
            </p>
        </div>
    </div>

    <script>
        let isLogin = true;

        function toggleMode() {
            isLogin = !isLogin;
            document.getElementById('action').value = isLogin ? 'login' : 'register';
            document.getElementById('btn-text').innerText = isLogin ? 'Sign In' : 'Create Account';
            document.getElementById('toggle-text').innerHTML = isLogin ? 
                `Don't have an account? <button onclick="toggleMode()" class="text-blue-400 hover:text-blue-300 font-medium transition-colors">Sign up</button>` :
                `Already have an account? <button onclick="toggleMode()" class="text-blue-400 hover:text-blue-300 font-medium transition-colors">Sign in</button>`;
            document.getElementById('error-message').classList.add('hidden');
        }

        async function handleAuth(event) {
            event.preventDefault();
            const form = event.target;
            const data = new FormData(form);
            const errorDiv = document.getElementById('error-message');
            
            errorDiv.classList.add('hidden');
            
            try {
                const response = await fetch('api/auth.php', {
                    method: 'POST',
                    body: data
                });
                
                const result = await response.json();
                
                if (result.success) {
                    window.location.href = 'dashboard.php';
                } else {
                    errorDiv.innerText = result.message || 'An error occurred. Please try again.';
                    errorDiv.classList.remove('hidden');
                }
            } catch (err) {
                errorDiv.innerText = 'Network error. Please make sure the backend is running.';
                errorDiv.classList.remove('hidden');
            }
        }
    </script>
</body>
</html>
