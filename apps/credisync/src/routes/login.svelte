<script lang="ts">
  import { supabase } from '../lib/supabase';

  let email = 'cobrador@demo.com';
  let password = '';
  let loading = false;
  let error = '';
  let success = '';

  async function handleLogin() {
    loading = true;
    error = '';
    success = '';

    try {
      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({
          email,
          password
        });

      if (signInError) throw signInError;

      success = '✅ Login exitoso! Redirigiendo...';
      setTimeout(() => {
        window.history.pushState({}, '', '/test-connection');
        window.dispatchEvent(new PopStateEvent('popstate'));
      }, 1500);
    } catch (err: any) {
      error = err.message || 'Error al iniciar sesión';
    } finally {
      loading = false;
    }
  }

  function goToTest() {
    window.history.pushState({}, '', '/test-connection');
    window.dispatchEvent(new PopStateEvent('popstate'));
  }
</script>

<div class="min-h-screen flex items-center justify-center bg-base-200">
  <div class="card w-96 bg-base-100 shadow-xl">
    <div class="card-body">
      <h2 class="card-title justify-center text-2xl mb-4">🔐 Login</h2>

      {#if error}
        <div class="alert alert-error">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="stroke-current shrink-0 h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{error}</span>
        </div>
      {/if}

      {#if success}
        <div class="alert alert-success">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="stroke-current shrink-0 h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{success}</span>
        </div>
      {/if}

      <form on:submit|preventDefault={handleLogin} class="space-y-4">
        <div class="form-control">
          <label class="label" for="email">
            <span class="label-text">Email</span>
          </label>
          <input
            id="email"
            type="email"
            bind:value={email}
            placeholder="cobrador@demo.com"
            class="input input-bordered"
            required
            disabled={loading}
          />
        </div>

        <div class="form-control">
          <label class="label" for="password">
            <span class="label-text">Password</span>
          </label>
          <input
            id="password"
            type="password"
            bind:value={password}
            placeholder="Tu contraseña"
            class="input input-bordered"
            required
            disabled={loading}
          />
        </div>

        <div class="form-control mt-6">
          <button type="submit" class="btn btn-primary" disabled={loading}>
            {#if loading}
              <span class="loading loading-spinner"></span>
              Iniciando sesión...
            {:else}
              Iniciar Sesión
            {/if}
          </button>
        </div>
      </form>

      <div class="divider">O</div>

      <div class="text-center text-sm">
        <button on:click={goToTest} class="link link-primary">
          Ver test de conexión (sin login)
        </button>
      </div>

      <div class="alert alert-info mt-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          class="stroke-current shrink-0 w-6 h-6"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div class="text-xs">
          <p><strong>Usuario de prueba:</strong></p>
          <p>Email: cobrador@demo.com</p>
          <p>Password: (el que configuraste en Supabase)</p>
        </div>
      </div>
    </div>
  </div>
</div>
