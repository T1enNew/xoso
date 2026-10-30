import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // Chạy được cả trên máy cũ: Windows 7 chỉ có tới Chrome/Edge 109, Firefox 115
    // (mặc định của Vite 8 cần Chrome 111 trở lên nên máy Win7 mở ra trang trắng)
    target: ['es2020', 'chrome87', 'edge88', 'firefox78', 'safari14'],
    cssTarget: ['chrome87', 'edge88', 'firefox78', 'safari14'],
  },
});
