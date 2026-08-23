// 前處理
// 設定Prisma client, cors, express
import {PrismaClient} from '@prisma/client'; //@ = npm 的「scoped package」語法，Scope（範圍）= 「命名空間 / 擁有者」，通常是公司名、組織名或使用者名。
import express from 'express';
import cors from 'cors';

// 產生後端伺服器以及資料庫
const app = express();
const prisma = new PrismaClient();

// 設定port以及網頁入口
const PORT = process.env.PORT || 3000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

// 註冊middleware
// app.use(...) = 把一個 middleware 掛進 Express 的處理管線。
app.use(cors({origin: FRONTEND_ORIGIN})); // 所有請求進來時，先讓 cors middleware 處理一次
app.use(express.json()); // 先解析body。所有請求進來時，如果 body 是 JSON，則解析成 JS 物件，塞到 req.body


// 開始寫handler（收到什麼請求就跑對應的function）

// health檢查
app.get('/health', (req, res)=>{
    res.status(200).json({status:'ok讚讚'});
})
// readiness 檢查（含 DB 連線）— 給 readinessProbe 用
app.get('/ready', async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;   // 探 DB 連得上嗎
        res.status(200).json({ status: 'ready', db: 'up' });
    } catch (err) {
        res.status(503).json({ status: 'not-ready', db: 'down' }); // DB 掛 → 503 → readiness 失敗 → 被踢出 LB
    }
})

// 開始監聽user操作的請求
// GET /api/todos - list all
app.get('/api/todos', async(req, res) => {
    const todos = await prisma.todo.findMany({
        orderBy:{createdAt: 'desc'},
    })
    res.json(todos);     // 回傳一筆json資料到前端，前端發現變數有變之後會重新渲染
})
// GET /api/todos - list a single todo
app.get('/api/todos/:id', async(req, res) => {
    const id = Number(req.params.id);
    if(Number.isNaN(id)){
        return res.status(400).json({error: 'invalid id'});
    }
    const todo = await prisma.todo.findUnique({
        where: {id: id},
    });
    if(!todo){
        return res.status(404).json({error: 'todo not found'});
    }
    res.json(todo);
})


// POST /api/todos - create
app.post('/api/todos', async (req, res) => {
    const { title } = req.body; // 從 req.body 這個物件裡，把 title 這個 property 挖出來，指派給名為 title 的變數
                                // title既是 key 名也是變數名。所以你不能亂改，改了就會挖不到。
    if(!title || typeof title !== 'string'){ // 若是create時某個todo沒有打上title，則跳出錯誤
        return res.status(400).json({error: 'title is required'});
    }
    const todo = await prisma.todo.create({data: {title}}); // 這些todo的函數都在官方預設的function庫寫好了，滑鼠放上去就能看寫法
    res.status(201).json(todo);
})

// PUT /api/todos/:id - update
app.put('/api/todos/:id', async (req, res) => {
    const id = Number(req.params.id); // 前端會打/api/todos/:id到後端，在後端可以用req.params.id來拿到目標的id
    if(Number.isNaN(id)){
        return res.status(400).json({error: 'invalid id number'});
    }
    const {title, done} = req.body;
    const todos = await prisma.todo.update({
        where: {id},
        data: {
            ...(title !== undefined && { title }), //如果title有值，則把{ title }併進去,如果title是undefined，則什麼都不加
            ...(done !== undefined && {done}), // ...代表把物件拆開
        },
    });
    res.json(todos);
})

// DELETE /api/todos/:id - delete
app.delete('/api/todos/:id', async (req, res) => {
    const id = Number(req.params.id);
    if(Number.isNaN(id)){
        return res.status(400).json({error: 'invalid id'});
    }
    const todos = await prisma.todo.delete({where: {id}}); // prisma.todo.delete(...) 會回傳被刪掉的那筆物件

    // send()跟json()都是送response、結束連線。只是json一定只能送json物件，send則不限。
    res.status(204).send(); // 204 的意思：「操作成功，但沒東西給你看」。用 send() 送空 body 最貼切。
})


// 檔案最後保留 export，app.listen 丟到server.js
export {app, prisma};
