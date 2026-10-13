import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Platform, Text, View } from "react-native";

import { getApiMode } from "@/lib/api/mode";
import { loadActions } from "@/lib/auth/lazy";
import { spacing, useColors, useTypography } from "@/theme";
import { Button, Screen, TextField } from "@/theme/components";

import { useSession } from "../store";

type Step = "choose" | "email" | "code";

/**
 * AUTH-1. Mock mode fakes every button. Live mode signs in through Supabase: Google in the system
 * browser and an email one-time code. Sign in with Apple is iOS only and waits for the Apple
 * Developer account (phase 23), so live mode does not offer it yet.
 */
export function WelcomeScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const typography = useTypography();
  const mockSignIn = useSession((s) => s.signIn);
  const live = getApiMode("auth") === "live";

  const [step, setStep] = useState<Step>("choose");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<void>, failure: string, onDone?: () => void) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      onDone?.();
    } catch (e) {
      // Closing the browser is not an error; the session store signs in on success.
      if (!(e instanceof loadActions().AuthError && e.kind === "cancelled")) setError(failure);
    } finally {
      setBusy(false);
    }
  };

  const showApple = Platform.OS === "ios" && !live;

  return (
    <Screen>
      <View style={{ gap: spacing.sm, paddingVertical: spacing.xl }}>
        <Text accessibilityRole="header" style={[typography.title, { color: colors.text }]}>
          {t("app.name")}
        </Text>
        <Text style={[typography.body, { color: colors.textMuted }]}>{t("welcome.tagline")}</Text>
      </View>

      {step === "choose" ? (
        <View style={{ gap: spacing.sm }}>
          {error ? (
            <Text
              accessibilityLiveRegion="polite"
              style={[typography.body, { color: colors.danger }]}
            >
              {error}
            </Text>
          ) : null}
          {showApple ? (
            <Button label={t("welcome.signInApple")} onPress={() => mockSignIn()} />
          ) : null}
          <Button
            variant={showApple ? "secondary" : "primary"}
            label={t("welcome.signInGoogle")}
            loading={busy}
            onPress={() =>
              live
                ? void run(() => loadActions().signInWithGoogle(), t("welcome.errorGoogle"))
                : mockSignIn()
            }
          />
          <Button
            variant="secondary"
            label={t("welcome.signInEmail")}
            disabled={busy}
            onPress={() => (live ? setStep("email") : mockSignIn())}
          />
        </View>
      ) : null}

      {step === "email" ? (
        <View style={{ gap: spacing.sm }}>
          <TextField
            label={t("welcome.emailLabel")}
            hint={t("welcome.emailHint")}
            error={error ?? undefined}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
          />
          <Button
            label={t("welcome.sendCode")}
            loading={busy}
            disabled={!email.includes("@")}
            onPress={() =>
              void run(
                () => loadActions().sendEmailCode(email),
                t("welcome.errorEmail"),
                () => setStep("code"),
              )
            }
          />
          <Button
            variant="secondary"
            label={t("welcome.back")}
            onPress={() => {
              setError(null);
              setStep("choose");
            }}
          />
        </View>
      ) : null}

      {step === "code" ? (
        <View style={{ gap: spacing.sm }}>
          <TextField
            label={t("welcome.codeLabel")}
            hint={t("welcome.codeHint", { email: email.trim() })}
            error={error ?? undefined}
            value={code}
            onChangeText={(v) => setCode(v.replace(/\D/g, ""))}
            maxLength={6}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
          />
          <Button
            label={busy ? t("welcome.signingIn") : t("welcome.verifyCode")}
            loading={busy}
            disabled={code.length !== 6}
            onPress={() =>
              void run(() => loadActions().verifyEmailCode(email, code), t("welcome.errorCode"))
            }
          />
          <Button
            variant="secondary"
            label={t("welcome.changeEmail")}
            onPress={() => {
              setCode("");
              setError(null);
              setStep("email");
            }}
          />
        </View>
      ) : null}

      {!live ? (
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          {t("welcome.mockNotice")}
        </Text>
      ) : null}
    </Screen>
  );
}
