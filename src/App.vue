<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { Window } from '@tauri-apps/api/window';
import { invoke } from "@tauri-apps/api/core";
import { LazyStore } from '@tauri-apps/plugin-store';

const PROMPT = `
I am learning English and would like to improve my language skills.
I will provide you with text that may contain grammatical errors or Chinese words.
Please help me by:
1. Correcting any grammatical mistakes
2. Translating any Chinese words to English
3. Improving the overall fluency while maintaining the original meaning

**Important: Only provide the corrected English text without any explanations or additional comments.**
`

const window = new Window('main');
const settingsStore = new LazyStore('settings.json');
const inputText = ref("");
const processedText = ref("");
const deepseekApiKey = ref("");

async function loadApiKey() {
  try {
    const key = await settingsStore.get('deepseek_api_key');
    if (key) {
      deepseekApiKey.value = key as string;
    }
  } catch (error) {
    console.error('Failed to load API key:', error);
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    window.hide();
  }
}


onMounted(async () => {
  await loadApiKey();
  
  const unlistenPromise = window.listen('set-input', async (event: { payload: string }) => {
    inputText.value = event.payload;
    console.log(event.payload);
    
    if (!deepseekApiKey.value) {
      console.error('API key not set');
      return;
    }
    
    try {
      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${deepseekApiKey.value}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: `${PROMPT}\n\n${event.payload}` }],
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      const content = data.choices[0].message.content;
      processedText.value = content;

      await invoke('process_text', { text: content });
    } catch (error) {
      console.error('Failed to process text:', error);
      processedText.value = 'Error processing text. Please check your API key and try again.';
    }
  });

  // Watch for store changes by periodically checking
  const storeCheckInterval = setInterval(async () => {
    await loadApiKey();
  }, 1000);

  document.addEventListener('keydown', handleKeydown);

  onUnmounted(async () => {
    document.removeEventListener('keydown', handleKeydown);
    clearInterval(storeCheckInterval);
    const unlisten = await unlistenPromise;
    unlisten();
  });
});
</script>

<template>
  <main class="container">
    <h2>Origin Input:</h2>
    <div>{{ inputText }}</div>
    <h2>Processing...</h2>
    <div>{{ processedText }}</div>
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
  height: 100vh;
  overflow-y: auto;
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
    overflow-y: scroll;
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