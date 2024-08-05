我希望新增一個檔案，在按下 finish grouping 按鈕後先將當前的網址/的最後面以mainRoom 的名稱存在localstorage，並將creatGroups.js 當中的groups，所有人依照groups的名單重新進行peer connection，新增檔案請將代碼完整寫出來

userid 計時的時間 以及 groups 傳給後端，後端再依照groups當中的人將peerId 傳回前端同一個 group 的所有人讓彼此互相連線，並在時間到了之後將原本同一個房間的所有人都重新連線，新增檔案請將代碼完整寫出來，請注意直接 import socket 可能會出現An error occurred: Uncaught ReferenceError: Cannot access 'socket' before initialization錯誤： 前端代碼

1. 以下是我的 db schema，要如何擴寫與改寫 createUserGroups.js，先從 mainRoom 找到 mainRoom id，接著再將產生的 groupName 當作 breakout_room table 的 name與此 mainRoom id insert 到 breakout_room table，並將得到的 breakout_room id 同時 insert 到 users_rooms_relation 當中有著同樣 mainRoom id 以及 user_id (在 createUserGroups.js 是 member.id) 的欄位，最後將 users_rooms_relation 的 id 連同user_id insert 到user_groups table：

    - 我希望最後createUserGroups回傳的是{ userId, groupName }