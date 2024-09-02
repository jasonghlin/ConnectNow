我希望新增一個檔案，在按下 finish grouping 按鈕後先將當前的網址/的最後面以mainRoom 的名稱存在localstorage，並將creatGroups.js 當中的groups，所有人依照groups的名單重新進行peer connection，新增檔案請將代碼完整寫出來

userid 計時的時間 以及 groups 傳給後端，後端再依照groups當中的人將peerId 傳回前端同一個 group 的所有人讓彼此互相連線，並在時間到了之後將原本同一個房間的所有人都重新連線，新增檔案請將代碼完整寫出來，請注意直接 import socket 可能會出現An error occurred: Uncaught ReferenceError: Cannot access 'socket' before initialization錯誤： 前端代碼

我希望 saveGroups可以回傳 {userid, groupId} 給前端，讓前端將此資訊讓每個使用者依照userid各將以 breakoutRoomId 的名稱用 localStorage 儲存

1. 以下是我的 db schema，要如何擴寫與改寫 createUserGroups.js，先從 mainRoom 找到 mainRoom id，接著再將產生的 groupName 當作 breakout_room table 的 name與此 mainRoom id insert 到 breakout_room table，並將得到的 breakout_room id 同時 insert 到 users_rooms_relation 當中有著同樣 mainRoom id 以及 user_id (在 createUserGroups.js 是 member.id) 的欄位，最後將 users_rooms_relation 的 id 連同user_id insert 到user_groups table：

    - 我希望最後createUserGroups回傳的是{ userId, groupName }
  
2. 要如何將程式碼要如何依照以下的 test.js 的模式將script.js 的檔案做改寫，讓stream 可以將背景做變更，test.html 的格式如下，請用一個新的檔案backgroundEffects.js 來完成：


<div class="webcam">
        <video id="webcam" autoplay style="display: none;"></video>
        <canvas id="canvas" width="1280px" height="720px"></canvas>
</div>