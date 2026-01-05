(function() {
    // 1. 防止重複加載：如果已經存在，就不要再創建了
    if (document.getElementById('my-bookmarklet-host')) {
        alert('控制台已經打開了！');
        return;
    }

    // 2. 創建宿主元素並附加 Shadow DOM (隔離樣式)
    const host = document.createElement('div');
    host.id = 'my-bookmarklet-host';
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });

    // 3. 定義 CSS 樣式
    const style = document.createElement('style');
    style.textContent = `
        /* 懸浮按鈕樣式 */
        #fab {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 50px;
            height: 50px;
            background-color: #007bff;
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            cursor: move; /* 鼠標變為移動圖標 */
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            z-index: 999999;
            user-select: none;
            transition: transform 0.1s;
        }
        #fab:active {
            transform: scale(0.95);
        }

        /* 懸浮窗面板樣式 */
        #panel {
            position: fixed;
            bottom: 80px;
            right: 20px;
            width: 200px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            padding: 15px;
            display: none; /* 默認隱藏 */
            flex-direction: column;
            gap: 10px;
            z-index: 999998;
            font-family: sans-serif;
            border: 1px solid #ddd;
            color: #333;
        }
        
        #panel h3 {
            margin: 0 0 10px 0;
            font-size: 16px;
            border-bottom: 1px solid #eee;
            padding-bottom: 5px;
        }

        /* 開關 (Toggle Switch) 樣式 */
        .switch-container {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .switch {
            position: relative;
            display: inline-block;
            width: 40px;
            height: 20px;
        }
        .switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }
        .slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #ccc;
            transition: .4s;
            border-radius: 20px;
        }
        .slider:before {
            position: absolute;
            content: "";
            height: 16px;
            width: 16px;
            left: 2px;
            bottom: 2px;
            background-color: white;
            transition: .4s;
            border-radius: 50%;
        }
        input:checked + .slider {
            background-color: #2196F3;
        }
        input:checked + .slider:before {
            transform: translateX(20px);
        }
    `;

    // 4. 定義 HTML 結構
    const container = document.createElement('div');
    container.innerHTML = `
        <!-- 懸浮按鈕 -->
        <div id="fab">⚙️</div>

        <!-- 懸浮窗 -->
        <div id="panel">
            <h3>控制面板</h3>
            <div class="switch-container">
                <span>運行</span>
                <label class="switch">
                    <input type="checkbox" id="run-toggle">
                    <span class="slider"></span>
                </label>
            </div>
            <div id="status" style="font-size:12px; color:#888; margin-top:5px;">狀態: 已停止</div>
        </div>
    `;

    // 5. 將樣式和 HTML 加入 Shadow DOM
    shadow.appendChild(style);
    shadow.appendChild(container);

    // 6. 獲取元素引用
    const fab = shadow.getElementById('fab');
    const panel = shadow.getElementById('panel');
    const toggle = shadow.getElementById('run-toggle');
    const statusText = shadow.getElementById('status');

    // --- 邏輯部分 ---

    // A. 拖拽邏輯
    let isDragging = false;
    let hasMoved = false; // 用來區分是點擊還是拖拽
    let startX, startY, initialLeft, initialTop;

    fab.addEventListener('mousedown', (e) => {
        isDragging = true;
        hasMoved = false;
        startX = e.clientX;
        startY = e.clientY;
        
        const rect = fab.getBoundingClientRect();
        // 將 right/bottom 轉換為 left/top 以便拖拽計算
        fab.style.right = 'auto';
        fab.style.bottom = 'auto';
        fab.style.left = rect.left + 'px';
        fab.style.top = rect.top + 'px';

        initialLeft = rect.left;
        initialTop = rect.top;
        
        e.preventDefault(); // 防止選中文字
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        
        // 如果移動超過 3px，視為拖拽，而不是點擊
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
            hasMoved = true;
        }

        fab.style.left = `${initialLeft + dx}px`;
        fab.style.top = `${initialTop + dy}px`;
        
        // 讓面板跟隨按鈕移動 (可選，這裡設定為簡單跟隨)
        panel.style.left = `${initialLeft + dx - 150}px`; // 簡單偏移
        panel.style.top = `${initialTop + dy - 100}px`;
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
    });

    window.addEventListener('mouseup', () => {
        isDragging = false;
    });

    // B. 點擊按鈕開關面板
    fab.addEventListener('click', () => {
        if (hasMoved) return; // 如果是拖拽結束，不觸發點擊
        if (panel.style.display === 'none' || panel.style.display === '') {
            panel.style.display = 'flex';
            // 重置面板位置到按鈕附近
            const rect = fab.getBoundingClientRect();
            panel.style.top = (rect.top - panel.offsetHeight - 10) + 'px';
            panel.style.left = (rect.left - panel.offsetWidth + rect.width) + 'px';
        } else {
            panel.style.display = 'none';
        }
    });

    // C. "運行" 開關邏輯
    let intervalId = null;

    toggle.addEventListener('change', (e) => {
        if (e.target.checked) {
            statusText.textContent = "狀態: 運行中...";
            statusText.style.color = "green";
            console.log(">>> 開始運行腳本邏輯");
            
            // --- 在這裡寫你想循環運行的代碼 ---
            intervalId = setInterval(() => {
                console.log("正在運行..."); 
                // 你可以在這裡加入具體的操作
            }, 1000);

        } else {
            statusText.textContent = "狀態: 已停止";
            statusText.style.color = "#888";
            console.log(">>> 停止運行");
            
            if (intervalId) {
                clearInterval(intervalId);
                intervalId = null;
            }
        }
    });

    console.log("懸浮球腳本加載完成！");
})();
