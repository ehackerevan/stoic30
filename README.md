# Stoic 30 → Decision OS

手機優先、單人使用、不需登入的個人不確定性與決策管理網站。

原專案 Stoic 30 的 30 天安全感練習仍保留；Decision OS V1 以增量方式加入，目標是把反覆思考轉成可管理的決策流程：

**事件 → 事實 → 推測 → 控制範圍 → 下一步 → 等待 → Review → 結果**

## Decision OS V1
- 首頁顯示「需要行動 / 等待中 / 今天需回顧」摘要
- 新增與編輯決策事件
- 事件分類：工作、人際、金錢、購物、學習、健康生活、旅行、專案、其他
- 事實與推測分離
- Control / Influence / Outside 三層控制地圖
- 下一個具體行動
- Review 日期
- 狀態：需要行動、等待中、待回顧、已完成
- 結果 / 回顧欄位
- 完成與刪除紀錄
- local-first，本機保存，不需登入

## 既有 Stoic 30 功能
- 今日頁依時間顯示早晨 / 晚間提示
- 早晨控制二分法與晚間回顧
- 90 秒不安介入流程
- 延遲確認可跨關頁 / 重開後繼續
- 本週 vs 上週趨勢
- 最近 7 天恢復時間圖
- 30 天每日完成狀態
- 不安事件紀錄查看、修改、刪除
- JSON 完整備份與還原
- CSV 匯出
- PWA / 加入手機主畫面

## 資料與相容性
- Stoic 30 舊資料：`stoic30.v2`
- Decision OS V1：`decisionos.v1`

兩套資料目前分開保存，因此加入 Decision OS 不會覆蓋既有 Stoic 30 紀錄。

## 隱私
資料預設只存在目前瀏覽器 localStorage，不會上傳到伺服器。清除瀏覽器網站資料會刪除紀錄，建議定期備份重要資料。

## GitHub Pages
專案使用 GitHub Actions 部署到 GitHub Pages。`main` 分支部署正式版本；Decision OS 開發先在 feature branch / pull request 進行。
