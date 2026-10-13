import "@/i18n";
import { useSession } from "@/features/session/store";
import { resetMockControl } from "@/lib/mock/control";
import { resetMockDb } from "@/lib/mock/db";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

// Mock state is module-level, so every test starts from a clean slate.
afterEach(() => {
  resetMockDb();
  resetMockControl();
  useSession.setState({ signedIn: false, lastSignInAt: null });
});
