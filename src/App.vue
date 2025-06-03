<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { Window } from '@tauri-apps/api/window';

const window = new Window('main');
const inputText = ref("");
const isProcessing = ref(false);

async function handleSubmit() {
  if (!inputText.value.trim()) return;
  isProcessing.value = true;
  try {
    await invoke("process_text", { text: inputText.value });
    inputText.value = "";
    await window.hide();
  } catch (error) {
    console.error(error);
  } finally {
    isProcessing.value = false;
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    window.hide();
  }
}

onMounted(() => {
  // Listen for clipboard text from Rust
  const unlistenPromise = window.listen('set-input', (event: { payload: string }) => {
    inputText.value = event.payload;
  });

  document.addEventListener('keydown', handleKeydown);

  onUnmounted(async () => {
    document.removeEventListener('keydown', handleKeydown);
    const unlisten = await unlistenPromise;
    unlisten();
  });
});
</script>

<template>
  <main class="container">
    <form class="input-form" @submit.prevent="handleSubmit">
      <textarea
        v-model="inputText"
        placeholder="Enter text..."
        @keydown.ctrl.enter.prevent="handleSubmit"
        autofocus
      />
      <button type="submit" :disabled="isProcessing">
        {{ isProcessing ? 'Processing...' : 'Submit' }}
      </button>
    </form>
  </main>
</template>

<style>
:root {
  color: #0f0f0f;
  background-color: transparent;
}

html,
body {
  overflow: hidden;
  margin: 0;
  padding: 0;
}

* {
  box-sizing: border-box;
}
*::-webkit-scrollbar {
  display: none;
}

.container {
  margin: 0;
  padding: 1rem;
  background-color: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.input-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

textarea {
  width: 100%;
  height: 100px;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  resize: none;
  font-family: inherit;
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

button:hover:not(:disabled) {
  background-color: #2857c0;
}

button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

@media (prefers-color-scheme: dark) {
  :root {
    color: #f6f6f6;
  }

  .container {
    background-color: rgba(45, 45, 45, 0.95);
  }

  textarea {
    background-color: rgba(15, 15, 15, 0.5);
    color: #fff;
    border-color: #444;
  }

  textarea::placeholder {
    color: #888;
  }
}
</style>