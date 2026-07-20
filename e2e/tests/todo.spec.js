import {test, expect} from '@playwright/test';
test.describe('Todo E2E test', () => {
  test('新增->顯示->勾選->刪除', async ({page}) => { // page 是 Playwright 的 fixture——自動注入的 Page 物件，代表一個瀏覽器分頁。
    const title = `E2E-${Date.now()}`;

    // ─── 開頁 ───
    // page.goto('/') = 打開網址
    //    '/' 是相對於 config 的 baseURL（http://localhost:5173）
    //    等同開瀏覽器輸入 http://localhost:5173
    await page.goto('/');
    
    // 斷言頁面有 <h1>Todo List</h1>
    //    getByRole('heading') = 找任何 <h1>~<h6>
    //    { name: 'Todo List' } = 內容是 'Todo List' 的那個
    await expect(page.getByRole('heading', {name: 'Todo List'})).toBeVisible();

    // ─── 新增 ───
    await page.getByRole('textbox').fill(title);
    await page.getByRole('button', {name:'新增'}).click();

    // ─── 驗證出現 ───
    const item = await page.getByText(title); // getByText(title) = 找內文是 title 的元素（就是新的 <li>）
    await expect(item).toBeVisible();

    // 前端標籤結構
    // <li key={todo.id}>
    //   <input
    //     type="checkbox"
    //     checked={todo.done}
    //     onChange={() => handleToggle(todo)}   // 前面的()不用放參數，直接用React給的todo參數（前面map有給）
    //   />
    //   {todo.title}
    //   <button onClick={() => handleDelete(todo.id)}>刪除</button>
    // </li>

    // ─── 勾選 checkbox ───
    const target_li = page.locator('li', {hasText: title});// 找到內容包含title的<li>元素
    await target_li.getByRole('checkbox').click(); // 本來是寫check，但是因為.check()=點+立刻驗（要求同步變化），前端跟不上，測試會fail
    await expect(target_li.getByRole('checkbox')).toBeChecked();

    // ─── 刪除 ───
    await target_li.getByRole('button', {name:'刪除'}).click();
    await expect(page.getByText(title)).not.toBeVisible();
  })
})