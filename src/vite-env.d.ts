/// <reference types="vite/client" />

interface Window {
  electronAPI: {
    executeMacro: (macroCode: string) => Promise<any[][]>;
  }
}