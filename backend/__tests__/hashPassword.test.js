import bcrypt from "bcrypt";
import { hashPassword } from "../utils/hashPassword.js";

jest.mock("bcrypt");

describe("hashPassword", () => {
  const password = "mySecretPassword";

  it("應該成功 hash 密碼", async () => {
    const mockHash = "$2b$10$abcdefg1234567890hashed";
    bcrypt.hash.mockResolvedValue(mockHash);

    const hashedPassword = await hashPassword(password);

    expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);

    expect(hashedPassword).toBe(mockHash);
  });

  it("應該在 hash 失敗時拋出錯誤", async () => {
    const mockError = new Error("Hashing failed");
    bcrypt.hash.mockRejectedValue(mockError);

    try {
      await hashPassword(password);
    } catch (err) {
      expect(err).toBe(mockError);
    }
  });
});
