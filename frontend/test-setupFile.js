// 每個前端test 檔跑前的統一前置

import '@testing-library/jest-dom'; // 把 .toBeInTheDocument()、.toHaveTextContent() 等 DOM 專用 matcher 掛進 Vitest 的 expect，讓你之後 test 能用。