import jwt from "jsonwebtoken";
import createAccessToken from "../utils/createAccessToken.js";

jest.mock("jsonwebtoken", () => ({
  sign: jest.fn(),
}));

describe("createAccessToken", () => {
  const mockUserId = "123";
  const mockUserName = "testUser";
  const mockUserEmail = "test@example.com";
  const mockSecretKey = "mock_secret_key";

  beforeEach(() => {
    process.env.JWT_SECRET_KEY = mockSecretKey;

    console.log("JWT_SECRET_KEY in test:", process.env.JWT_SECRET_KEY);

    // jest.mock("jsonwebtoken", () => ({
    //   sign: jest.fn().mockResolvedValue("mocked_token"),
    // }));
    jwt.sign.mockImplementation((payload, secretKey, options, callback) => {
      callback(null, "mocked_token");
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return a token when sign is successful", async () => {
    const token = await createAccessToken(
      mockUserId,
      mockUserName,
      mockUserEmail,
      "7d"
    );

    expect(jwt.sign).toHaveBeenCalledWith(
      { userId: mockUserId, userName: mockUserName, userEmail: mockUserEmail },
      mockSecretKey,
      { expiresIn: "7d" },
      expect.any(Function)
    );

    expect(token).toBe("mocked_token");
  }); // 設置 10 秒的超時時間

  it("should throw an error when sign fails", async () => {
    jwt.sign.mockImplementationOnce((payload, secretKey, options, callback) => {
      callback(new Error("JWT signing failed"));
    });

    await expect(
      createAccessToken(mockUserId, mockUserName, mockUserEmail, "7d")
    ).rejects.toThrow("JWT signing failed");
  });
});
