import {describe, it, expect, beforeEach, vi} from 'vitest';


import request from 'supertest'; //supertest = 專門用來測 HTTP server（尤其 Express）的 npm 套件。require('supertest') 回傳一個 function，慣例存進變數 request。你 用它打你的 Express app，測 API 回應對不對——不用啟動真的 server、不用開 port。 
import {app, prisma} from '../src/index.js'; // 後端程式index.js最後執行 exports {app, prisma};

// test 遵循「Arrange/Act/Assert 」方法，並用vi.spy模擬資料庫
describe('Todo API', () => {
    // 每個 test 開跑前把所有 spy 還原，避免互相污染
    beforeEach(() => {
        vi.restoreAllMocks();
    })
    // 測get
    describe('GET testing', () => {
        //測正常getMany
        it('正常getMany，回傳200', async () => {
            // Arrange
            const fakeTodos = [
                {
                    id: 3,
                    title: '洗澡',
                    done: false,
                    createdAt: new Date().toISOString(),
                },
                {
                    id: 4,
                    title: '吃飯',
                    done: false,
                    createdAt: new Date().toISOString(),
                }
            ]
            vi.spyOn(prisma.todo, 'findMany').mockResolvedValue(fakeTodos);

            // Act (模擬client打api到後端)
            const res = await request(app).get('/api/todos'); // res是後端處理完之後傳回前端的json物件
            
            // Assert
            expect(res.status).toBe(200);
            expect(res.body).toEqual(fakeTodos);
        });
        it('正常取得單一個todo，回傳200', async () => {
            // Assert
            const fakeTodo = {
                id: 3,
                title: '洗澡',
                done: true,
                createdAt: new Date().toISOString(),
            }
            const spy = vi.spyOn(prisma.todo, 'findUnique').mockResolvedValue(fakeTodo);

            // Act
            const res = await request(app).get('/api/todos/3');

            // Assert
            expect(res.status).toBe(200);
            expect(res.body).toEqual(fakeTodo);
        })
        it('取得單一todo，但是查無id，回傳404', async () => {
            // Assert
            const spy = vi.spyOn(prisma.todo, 'findUnique').mockResolvedValue(null);

            // Act
            const res = await request(app).get('/api/todos/999');

            // Assert
            expect(res.status).toBe(404);
            expect(res.body.error).toEqual('todo not found');
            expect(spy).toHaveBeenCalledWith({where:{id:999}});// 確實有呼叫findUnique()參數帶入id:999，只是因為沒找到才回傳error
        });
        it('取得單一todo，但是id無效，回傳400', async () => {
            // Assert
            const spy = vi.spyOn(prisma.todo, 'findUnique');

            // Act
            const res = await request(app).get('/api/todos/wrongTitle');

            // Assert
            expect(res.status).toBe(400);
            expect(res.body.error).toEqual('invalid id');
            expect(spy).not.toHaveBeenCalledWith();
        })
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
            // .mockResolvedValue(fakeTodo) 的意思是：
            // 以後 prisma.todo.create(...) 被呼叫時，不管傳什麼參數進來，都不真的執行，直接 resolve 出 fakeTodo。
            // create是prisma提供的函數，先用spy控制他的函數回傳值
            vi.spyOn(prisma.todo, 'create').mockResolvedValue(fakeTodo); // 要測試我在後端寫的handler是否正確執行、是否正確呼叫prisma提供的create函數。
            
            // Act （這個撰寫風格是supertest適用在Express上）
            // request(app) 回傳的是「HTTP request builder」
            // 它是 supertest 提供的「起點物件」——可以上面 chain 呼叫 .post(), .get(), .send() 
            const res = await request(app).post(`/api/todos`).send({title: inputTitle});

            // Assert
            expect(res.status).toBe(201); // 正確create
            expect(res.body).toEqual(fakeTodo);
        });
        it('測試傳入錯誤的title，預期會得到400 error', async () => {
            // Arrange
            const wrongTitle = 123;
            const spy = vi.spyOn(prisma.todo, 'create'); // spy不需要mock資料，因為我handler設計「title沒過就直接回報錯誤」

            // Act 
            const res = await request(app).post('/api/todos').send({title: wrongTitle});

            // Assert
            expect(res.status).toBe(400); // Bad request
            expect(res.body.error).toEqual('title is required');
            expect(spy).not.toHaveBeenCalled(); // 這比 400 更能證明「擋在驗證層」
        })
    })

    // 測PUT
    describe('PUT testing', () => {
        it('正常修改done狀態，回傳200', async () => {
            // Arrange
            const fakeTodo = {
                id: 3,
                title: '洗澡',
                done: true,
                createdAt: new Date().toISOString(),
            }
            const spy = vi.spyOn(prisma.todo, 'update').mockResolvedValue(fakeTodo);

            // Act 
            // .send({ done: true }) 就是模擬「client 送 body { done: true }」，handler 接到的 req.body 就是這個物件
            const res = await request(app).put('/api/todos/3').send({ done: true }); 

            // assert
            expect(res.status).toBe(200);
            expect(res.body).toEqual(fakeTodo);
            expect(spy).toHaveBeenCalledWith({ // 確認handler有沒有正確把 body 傳給 Prisma
                where: {id: 3},
                data: {done: true},
            })
        });
        it('正常修改done以及title', async () => {
            // 2026/7/14前端沒有寫修改title的函數，但是還是可以測試後端的handler是否正常運作
            // Arrange
            const newTitle = '吃飯';
            const fakeTodo = {
                id: 3,
                title: newTitle,
                done: true,
                createdAt: new Date().toISOString(),
            }
            const spy = vi.spyOn(prisma.todo, 'update').mockResolvedValue(fakeTodo);

            // Act (模擬client打api到後端)
            const res = await request(app).put('/api/todos/3').send({title: newTitle, done: true});

            // Assert
            expect(res.status).toBe(200);
            expect(res.body).toEqual(fakeTodo);
            expect(spy).toHaveBeenCalledWith({
                where: {id: 3},
                data: {done: true, title: newTitle},
            });
        })
        it('傳入錯誤id', async () => {
            // Arrange
            const spy = vi.spyOn(prisma.todo, 'update');

            // Act (模擬client打api到後端)
            const res = await request(app).put('/api/todos/wrongId');

            // Assert
            expect(res.status).toBe(400);
            expect(res.body.error).toEqual('invalid id number');
            expect(spy).not.toHaveBeenCalled();
        })
    })

    // 測DELETE
    describe('DELETE testing', () => {
        it('測試正常刪除，回傳204', async () => {
            // Arrange
            // 雖然prisma.todo.delete(...) 會回傳被刪掉的那筆物件，但是我的handler設定res會回傳空物件，所以delete()回傳什麼都不重要了
            const spy = vi.spyOn(prisma.todo, 'delete').mockResolvedValue({}); 

            // Act
            const res = await request(app).delete('/api/todos/3');

            // Assert
            expect(res.status).toBe(204); // 204: No Content
            expect(res.body).toEqual({}); // 如果handler設定成回傳delete掉的物件，那testing就能寫成toBe(200)+toEqual(fakeTodo)
            expect(spy).toHaveBeenCalledWith({where: {id:3}});
        });
        it('測試傳入錯誤id，回傳400', async () => {
            // Arrange
            const spy = vi.spyOn(prisma.todo, 'delete'); 
            // Act
            const res = await request(app).delete('/api/todos/wrongId');

            // Assert
            expect(res.status).toBe(400); // 400 Bad Request
            expect(res.body.error).toEqual('invalid id'); 
            expect(spy).not.toHaveBeenCalled();
        })
    });

})