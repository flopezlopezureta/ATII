
import { LoginLogoIcon, EyeIcon, EyeSlashIcon } from '../../components/icons.js';
import { loginUser } from '../../services/authService.js';
import { showFeedback } from '../../utils.js';

export function renderLoginScreen() {
    const appVersion = "v1.0.0-js";
    return `
    <div class="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-200 via-slate-100 to-sky-100 p-4">
      <div class="w-full max-w-md bg-white p-8 rounded-xl shadow-2xl">
        <div class="text-center mb-6">
            ${LoginLogoIcon("mx-auto mb-4")}
            <p class="text-slate-500 text-lg mt-1">Inicia sesión para continuar</p>
        </div>
        
        <div id="feedback-container"></div>
        
        <form id="login-form" class="space-y-6">
          <div>
            <label for="username" class="block text-sm font-medium text-slate-700 mb-1">Nombre de Usuario</label>
            <input
              type="text"
              id="username"
              class="w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition duration-150"
              placeholder="Tu nombre de usuario"
              required
            />
          </div>
          <div>
            <label for="password" class="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
            <div class="relative">
              <input
                type="password"
                id="password"
                class="w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition duration-150 pr-10"
                placeholder="Tu contraseña"
                required
              />
              <button
                type="button"
                id="toggle-password"
                class="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5 text-slate-500 hover:text-slate-700 focus:outline-none"
                aria-label="Mostrar contraseña"
              >
                ${EyeIcon()}
              </button>
            </div>
          </div>
          <button
            type="submit"
            id="submit-btn"
            class="w-full bg-sky-600 hover:bg-sky-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-opacity-50 transition duration-150 transform hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            Iniciar Sesión
          </button>
        </form>
        <p class="mt-8 text-center text-sm text-slate-600">
          ¿No tienes una cuenta?
          <button id="switch-to-register" class="font-medium text-sky-600 hover:text-sky-500 hover:underline">
            Regístrate aquí
          </button>
        </p>
      </div>
       <footer class="w-full max-w-md mt-8 text-center">
        <p class="text-sm text-slate-500">&copy; ${new Date().getFullYear()} CondoAccess App. Todos los derechos reservados.</p>
        <p class="text-xs text-slate-500 mt-1">Versión ${appVersion} - SELCOM LTDA.</p>
      </footer>
    </div>
    `;
}

export function attachLoginScreenListeners(onLoginSuccess, switchToRegister) {
    const form = document.getElementById('login-form');
    const togglePasswordBtn = document.getElementById('toggle-password');
    const passwordInput = document.getElementById('password');
    const submitBtn = document.getElementById('submit-btn');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = passwordInput.value;

        if (!username.trim() || !password.trim()) {
            showFeedback('feedback-container', 'error', 'Nombre de usuario y contraseña son obligatorios.');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Iniciando...';
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const result = loginUser(username, password);
        
        if (result.success) {
            onLoginSuccess();
        } else {
            showFeedback('feedback-container', 'error', result.message);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Iniciar Sesión';
        }
    });

    togglePasswordBtn.addEventListener('click', () => {
        const isPassword = passwordInput.type === 'password';
        passwordInput.type = isPassword ? 'text' : 'password';
        togglePasswordBtn.innerHTML = isPassword ? EyeSlashIcon() : EyeIcon();
    });

    document.getElementById('switch-to-register').addEventListener('click', switchToRegister);
}