import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

import { LargeSecureStore } from "./largeSecureStore";

// In-memory SecureStore: the real one needs the Keychain / Keystore.
const mockSecure = new Map<string, string>();
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(async (key: string) => mockSecure.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => void mockSecure.set(key, value)),
  deleteItemAsync: jest.fn(async (key: string) => void mockSecure.delete(key)),
}));

const session = JSON.stringify({
  access_token: "a".repeat(1500),
  refresh_token: "r".repeat(40),
  user: { id: "u1", email: "test@example.com" },
});

describe("LargeSecureStore (AUTH-5)", () => {
  beforeEach(async () => {
    mockSecure.clear();
    await AsyncStorage.clear();
  });

  it("round-trips a session larger than the SecureStore limit", async () => {
    const store = new LargeSecureStore();
    await store.setItem("session", session);
    expect(session.length).toBeGreaterThan(1500);
    expect(await store.getItem("session")).toBe(session);
  });

  it("keeps only the key in SecureStore and an encrypted payload in AsyncStorage", async () => {
    await new LargeSecureStore().setItem("session", session);

    const stored = await AsyncStorage.getItem("session");
    expect(stored).not.toBeNull();
    expect(stored).not.toContain("refresh_token");
    expect(stored).not.toContain("test@example.com");
    expect(mockSecure.get("session")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("uses a new key for every write", async () => {
    const store = new LargeSecureStore();
    await store.setItem("session", session);
    const first = mockSecure.get("session");
    await store.setItem("session", session);
    expect(mockSecure.get("session")).not.toBe(first);
    expect(await store.getItem("session")).toBe(session);
  });

  it("removeItem clears both the payload and the key", async () => {
    const store = new LargeSecureStore();
    await store.setItem("session", session);
    await store.removeItem("session");

    expect(await AsyncStorage.getItem("session")).toBeNull();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("session");
    expect(await store.getItem("session")).toBeNull();
  });

  it("treats a payload without its key as no session", async () => {
    const store = new LargeSecureStore();
    await store.setItem("session", session);
    mockSecure.clear();
    expect(await store.getItem("session")).toBeNull();
  });
});
