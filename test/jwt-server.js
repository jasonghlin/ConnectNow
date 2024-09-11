import express from "express";
import jwt from "jsonwebtoken";
import bodyParser from "body-parser";

const app = express();
app.use(bodyParser.json());

const JWT_SECRET_KEY = "secret key";

// 創建一個 Set 來儲存已經分配過的數字
const usedNumbers = new Set();

function getRandomUniqueNumber(min, max) {
  if (usedNumbers.size >= max - min + 1) {
    usedNumbers = new Set();
  }

  let randomNumber;
  do {
    randomNumber = Math.floor(Math.random() * (max - min + 1)) + min;
  } while (usedNumbers.has(randomNumber));

  usedNumbers.add(randomNumber);
  return randomNumber;
}

app.post("/login", (req, res) => {
  const { email, password } = req.body;

  try {
    // 獲取一個唯一的 1 到 3000 的數字
    const userId = getRandomUniqueNumber(1, 3000);

    // 創建 JWT token
    const token = jwt.sign(
      {
        userId: userId,
        email: email,
      },
      JWT_SECRET_KEY,
      { expiresIn: "1h" }
    );

    // 返回 token 給客戶端
    res.json({ token });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
