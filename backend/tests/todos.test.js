import {describe, it, expect, beforeEach, vi} from 'vitest';


import request from 'supertest'; //supertest = 專門用來測 HTTP server（尤其 Express）的 npm 套件。require('supertest') 回傳一個 function，慣例存進變數 request。你 用它打你的 Express app，測 API 回應對不對——不用啟動真的 server、不用開 port。 
import {app, prisma} from '../src/index.js'; // 後端程式index.js最後執行 exports {app, prisma};

// test 遵循「Arrange/Act/Assert 」方法，並用vi.spy模擬資料庫
describe('Todo API', () => {
    // 每個 test 開跑前把所有 spy 還原，避免互相污染
    beforeEach(() => {
        vi.restoreAllMocks();
    })
    // 測post
    describe('POST testing', () => {
        // 第一個單元測試
        it('正常建立回 201 + 傳給 Prisma 正確 data', async () => {
            // Arrange
            const inputTitle = '洗澡';
            const fakeTodo = {
                id: 3,
                title: inputTitle,
                done: false,
                createdAt: new Date().toISOString(),
            }
            vi.spyOn(prisma.todo, 'create').mockResolvedValue(fakeTodo); // 要測試我在後端寫的handler是否正確執行、是否正確呼叫prisma提供的create函數。
            
            // Act （這個撰寫風格是supertest適用在Express上）
            const res = await request(app).post(`/api/todos`).send({title: inputTitle});

            // Assert
            expect(res.status).toBe(201); // 正確
            expect(res.body).toEqual(fakeTodo);
        });
        
    });

})