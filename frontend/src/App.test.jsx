// 這份測試的情境是：前端fetch出API到後端，後端傳回來mock好的資料，前端是否能用這份回傳的JSON順利完成前端作業(渲染)

// 因為vite.config.js有設定globals: true，所以在App.test.jsx中不用import {beforeEach, vi, describe}
// import { beforeEach } from 'vitest';
import App from './App.jsx';

// render(component) — 把 React 元件掛進假 DOM
// screen — 查詢 DOM 的入口
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';


// 先把後端的回傳值Mock，避免真的打到後端
beforeEach(() => {
    // 這裡都是在寫「模擬的」後端行為
    // 如果不 mock，fetch 真的去打 http://localhost:3000 → 後端沒開 → 失敗
    global.fetch = vi.fn((url, options) => { // global.fetch = ... : 覆蓋全域 fetch 函式
        // GET /api/todos ：回傳空陣列
        if(!options || options === 'GET' || !options.method ){ // 都視為GET。!option代表沒有寫method，則系統預設為GET
            return Promise.resolve({
                ok: true, // res.ok = true ：HTTP status是2xx，進 handler 成功路徑
                json: () => Promise.resolve([]), // res.json() 回空陣列
            });
        }
        // POST /api/todos → 回傳新todo
        if(options.method === 'POST'){
            // 前端打POST到後端，後端會回傳新增的物件回去
            const body = JSON.parse(options.body); // options.body是前端寫好要新增的物件
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({
                    id: 1,
                    title: body.title,
                    done: false,
                    createdAt: new Date().toISOString(),
                }),
            });
        };
        // 其他事件暫時不處理
        return Promise.reject(new Error('unhandled'));
    });
});

// 開始寫測試單元
describe('App Testing', () => {
    it('渲染標題', () => {
        // Arrange & Act
        render(<App />);

        // Assert
        expect(screen.getByText('Todo List')).toBeInTheDocument();
    });

    it('使用者輸入＋按新增，會出現該清單',async () => {
        // Arrange
        render(<App />);
        const user = userEvent.setup();

        // Act 模擬user在前端操作
        const input = screen.getByRole('textbox');
        await user.type(input, '刷牙');
        // 前端test在模擬user操作時，都是用getByRole來取的HTML標籤
        // 下面這句相當於找到<button>新增</button>
        await user.click(screen.getByRole('button', {name: '新增'})) 

        // Assert

        // findByText要非同步，元素是render之後才出現，所以要await
        // 上面的getBytext是同步的，第一次render好就出現了
        expect(await screen.findByText('刷牙')).toBeInTheDocument();
    })
});
