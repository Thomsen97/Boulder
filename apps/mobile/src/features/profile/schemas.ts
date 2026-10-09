import { z } from "zod";

import { validateUsername } from "./username";

export const DISPLAY_NAME_MAX = 50;
export const BIO_MAX = 160;

// Messages are i18n keys; screens translate them with t(message).
const username = z.string().superRefine((value, ctx) => {
  const result = validateUsername(value);
  if (!result.valid) ctx.addIssue({ code: "custom", message: `username.error.${result.error}` });
});

const displayName = z
  .string()
  .trim()
  .min(1, "profile.error.displayNameRequired")
  .max(DISPLAY_NAME_MAX, "profile.error.displayNameTooLong");

export const onboardingSchema = z.object({
  username,
  displayName,
  ageConfirmed: z.boolean().refine((v) => v, "onboarding.error.ageRequired"),
  guidelinesAccepted: z.boolean().refine((v) => v, "onboarding.error.guidelinesRequired"),
});
export type OnboardingForm = z.infer<typeof onboardingSchema>;

export const editProfileSchema = z.object({
  username,
  displayName,
  bio: z.string().max(BIO_MAX, "profile.error.bioTooLong"),
});
export type EditProfileForm = z.infer<typeof editProfileSchema>;
