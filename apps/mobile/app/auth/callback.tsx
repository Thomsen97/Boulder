import { Redirect } from "expo-router";

/**
 * Landing route of the `boulder://auth/callback` deep link. The sign-in code is exchanged in
 * `signInWithGoogle` (src/lib/auth/actions.ts); this route only keeps the router from showing
 * "not found" and sends the user back to the gate, which routes by session.
 */
export default function AuthCallback() {
  return <Redirect href="/" />;
}
