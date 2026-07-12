import { useEffect, useState } from "react";

// 設定VITE
const API_URL = import.meta.env.VITE_API_URL; // 在.env中設定VITE_API_URL = http://localhost:3000

// 主元件
function App() { // 要跟檔案名稱一致
  // 設定變數
  const [todos, setTodos] = useState([]); // todos是陣列，所以傳入空陣列當作初始化
  const [newTitle, setNewTitle] = useState(''); // user在前端輸入匡輸入文字後，就會觸發setNewTitle

  // 頁面載入時撈清單
  useEffect(() => {
    fetch(`${API_URL}/api/todos`)     // fetch裡面不用寫method='GET'是因為系統已經預設了。
    .then((res) => {
      if(!res.ok) throw new Error(`HTTPS${res.status}`);
      return res.json();
    })
    .then(setTodos)
  }, []); // 第二個參數[]代表這個function只做一次，不用監看哪個變數使否變動。

  // 新增 todo
  async function handleAdd(e){ // e是DOM事件塞過來的event事件（例如按下按鈕後觸發）
    e.preventDefault();
    const res = await fetch(`${API_URL}/api/todos`, { // 加上await是確保變數有順利被fetch完才進下一行
      method: 'POST',
      headers: {'Content-Type':'application/json'}, 
      body: JSON.stringify({title: newTitle}), // 會傳遞{ title: '喝水' } (JS 物件)到後端
    })
    const created = await res.json(); // POS完之後會回傳新增的這筆todo給res變數
    setTodos([created, ...todos]);
    setNewTitle(''); // 把newTitle變數清空
  } 
  // 更改狀態（是否完成）
  async function handleToggle(todo){  // id是<input>標籤中onChange呼叫實會傳入的
    const res = await fetch(`${API_URL}/api/todos/${todo.id}`,{ // res是更新後的整個todos
      method:'PUT',
      headers: {'Content-Type':'application/json'}, 
      body: JSON.stringify({done: !todo.done}),
    })
    const updated = await res.json();
    setTodos(todos.map((t) => (t.id === updated.id ? updated : t))); // iter整個todos，找到有修改的那一筆
  }

  // 刪除 todo
  async function handleDelete(id){
    await fetch(`${API_URL}/api/todos/${id}`,{
      method: 'DELETE',
    })
    setTodos(todos.filter((t) => t.id !== id)) // filter()會對每個todos呼叫這個 callback，把todos塞進 t
  }


  return (
    <div>
      <h1>Todo List</h1>
      <form onSubmit={handleAdd}>
        <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)}></input>
        <button type="submit">新增</button>
      </form>
      {/* 顯示todos列表 */}
      <ul>
        {todos.map((todo) => (  // 這裡=>之後是用小括號，代表「隱式回傳」。
          // key 是 React 用來辨別「哪一筆是哪一筆」的身份證
          <li key={todo.id}>
            <input
              type="checkbox"
              checked={todo.done}
              onChange={() => handleToggle(todo)}   // 前面的()不用放參數，直接用React給的todo參數（前面map有給）
            />
            {todo.title}
            <button onClick={() => handleDelete(todo.id)}>刪除</button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default App;