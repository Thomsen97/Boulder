import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import { AuthError } from "@/lib/auth/actions";
import { renderWithProviders } from "@/test/helpers";

import { WelcomeScreen } from "./screens/WelcomeScreen";

const mockActions = {
  AuthError,
  sendEmailCode: jest.fn(),
  verifyEmailCode: jest.fn(),
  signInWithGoogle: jest.fn(),
};
jest.mock("@/lib/auth/lazy", () => ({ loadActions: () => mockActions }));

describe("WelcomeScreen in live mode (AUTH-1)", () => {
  const original = process.env.EXPO_PUBLIC_API_MODE;

  beforeEach(() => {
    process.env.EXPO_PUBLIC_API_MODE = "live";
    Object.values(mockActions).forEach(
      (fn) => typeof fn === "function" && "mockReset" in fn && fn.mockReset(),
    );
  });
  afterEach(() => {
    process.env.EXPO_PUBLIC_API_MODE = original;
  });

  it("offers Google and e-post, but not Apple until the Apple account exists", async () => {
    await renderWithProviders(<WelcomeScreen />);
    expect(screen.getByRole("button", { name: "Fortsett med Google" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Fortsett med e-post" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Fortsett med Apple" })).toBeNull();
    expect(screen.queryByText(/innloggingen er foreløpig falsk/)).toBeNull();
  });

  it("sends the code and verifies the 6 digits", async () => {
    mockActions.sendEmailCode.mockResolvedValue(undefined);
    mockActions.verifyEmailCode.mockResolvedValue(undefined);
    await renderWithProviders(<WelcomeScreen />);

    await fireEvent.press(screen.getByRole("button", { name: "Fortsett med e-post" }));
    await fireEvent.changeText(screen.getByLabelText("E-postadresse"), "emma@example.com");
    await fireEvent.press(screen.getByRole("button", { name: "Send kode" }));

    const codeField = await screen.findByLabelText("Kode fra e-posten");
    expect(mockActions.sendEmailCode).toHaveBeenCalledWith("emma@example.com");

    await fireEvent.changeText(codeField, "12a345");
    expect(screen.getByLabelText("Kode fra e-posten").props.value).toBe("12345");
    await fireEvent.changeText(codeField, "123456");
    await fireEvent.press(screen.getByRole("button", { name: "Logg inn" }));

    await waitFor(() =>
      expect(mockActions.verifyEmailCode).toHaveBeenCalledWith("emma@example.com", "123456"),
    );
  });

  it("shows an error for a wrong code and stays on the code step", async () => {
    mockActions.sendEmailCode.mockResolvedValue(undefined);
    mockActions.verifyEmailCode.mockRejectedValue(new AuthError("failed"));
    await renderWithProviders(<WelcomeScreen />);

    await fireEvent.press(screen.getByRole("button", { name: "Fortsett med e-post" }));
    await fireEvent.changeText(screen.getByLabelText("E-postadresse"), "emma@example.com");
    await fireEvent.press(screen.getByRole("button", { name: "Send kode" }));
    await fireEvent.changeText(await screen.findByLabelText("Kode fra e-posten"), "000000");
    await fireEvent.press(screen.getByRole("button", { name: "Logg inn" }));

    expect(await screen.findByText(/Koden stemmer ikke/)).toBeTruthy();
    expect(screen.getByLabelText("Kode fra e-posten")).toBeTruthy();
  });

  it("starts Google sign-in and shows no error when the browser is closed", async () => {
    mockActions.signInWithGoogle.mockRejectedValue(new AuthError("cancelled"));
    await renderWithProviders(<WelcomeScreen />);

    await fireEvent.press(screen.getByRole("button", { name: "Fortsett med Google" }));

    await waitFor(() => expect(mockActions.signInWithGoogle).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/Innloggingen med Google mislyktes/)).toBeNull();
  });

  it("shows an error when Google sign-in fails", async () => {
    mockActions.signInWithGoogle.mockRejectedValue(new AuthError("failed"));
    await renderWithProviders(<WelcomeScreen />);

    await fireEvent.press(screen.getByRole("button", { name: "Fortsett med Google" }));
    expect(await screen.findByText(/Innloggingen med Google mislyktes/)).toBeTruthy();
  });
});
