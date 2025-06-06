<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { LazyStore } from '@tauri-apps/plugin-store';
import { Window } from '@tauri-apps/api/window';

const deepseekApiKey = ref('');
const window = new Window('settings');
const settingsStore = new LazyStore('settings.json');

onMounted(async () => {
  try {
    // Load the API key from store when component mounts
    const storedKey = await settingsStore.get('deepseek_api_key');
    if (storedKey) {
      deepseekApiKey.value = storedKey as string;
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
});

async function saveSettings() {
  try {
    await settingsStore.set('deepseek_api_key', deepseekApiKey.value);
    await settingsStore.save();
    window.hide();
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}
</script>

<template>
  <main class="settings-container">
    <h2>Settings</h2>
    <form @submit.prevent="saveSettings" class="settings-form">
      <div class="form-group">
        <label for="deepseekApiKey">Deepseek API Key:</label>
        <input 
          type="password"
          id="deepseekApiKey"
          v-model="deepseekApiKey"
          placeholder="Enter your Deepseek API key"
        />
      </div>
      <button type="submit">Save Settings</button>
    </form>
  </main>
</template>

<style scoped>
.settings-container {
  padding: 2rem;
  max-width: 600px;
  margin: 0 auto;
  background-color: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.settings-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

label {
  font-weight: 500;
}

input {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

button {
  padding: 0.5rem 1rem;
  background-color: #396cd8;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

button:hover {
  background-color: #2857c0;
}

@media (prefers-color-scheme: dark) {
  .settings-container {
    background-color: rgba(45, 45, 45, 0.95);
    color: #f6f6f6;
  }

  input {
    background-color: rgba(15, 15, 15, 0.5);
    color: #fff;
    border-color: #444;
  }

  input::placeholder {
    color: #888;
  }
}
</style>
