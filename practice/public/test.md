我希望新增一個檔案，在按下 finish grouping 按鈕後先將當前的網址/的最後面以mainRoom 的名稱存在localstorage，並將creatGroups.js 當中的groups，所有人依照groups的名單重新進行peer connection，新增檔案請將代碼完整寫出來

userid 計時的時間 以及 groups 傳給後端，後端再依照groups當中的人將peerId 傳回前端同一個 group 的所有人讓彼此互相連線，並在時間到了之後將原本同一個房間的所有人都重新連線，新增檔案請將代碼完整寫出來，請注意直接 import socket 可能會出現An error occurred: Uncaught ReferenceError: Cannot access 'socket' before initialization錯誤： 前端代碼