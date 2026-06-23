import { FormEvent, useState } from "react";
import { LockKeyhole } from "lucide-react";
import { supabase } from "../lib/supabase";

export function AuthGate() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitAuth = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) return;

    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    const result = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    if (result.error) {
      setError(result.error.message);
    } else if (isSignUp && !result.data.session) {
      setMessage("Account created. Check email confirmation settings if sign-in does not continue automatically.");
    } else {
      setMessage("Signed in. Loading LIVAL OS.");
    }

    setIsSubmitting(false);
  };

  return (
    <main className="auth-screen">
      <section className="auth-card">
        <div className="brand auth-brand">
          <div className="brand-mark">LV</div>
          <div>
            <strong>LIVAL OS</strong>
            <span>Private command system</span>
          </div>
        </div>
        <h1>{isSignUp ? "Create private access" : "Sign in"}</h1>
        <p>Use the email/password account connected to the LIVAL_OS Supabase project.</p>
        <form onSubmit={submitAuth}>
          <label>
            Email
            <input
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>
          <label>
            Password
            <input
              autoComplete={isSignUp ? "new-password" : "current-password"}
              minLength={6}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>
          {error && <div className="app-alert error">{error}</div>}
          {message && <div className="app-alert success">{message}</div>}
          <button className="primary-action" disabled={isSubmitting} type="submit">
            <LockKeyhole size={17} />
            {isSubmitting ? "Working..." : isSignUp ? "Create account" : "Sign in"}
          </button>
        </form>
        <button className="link-button" onClick={() => setIsSignUp((value) => !value)} type="button">
          {isSignUp ? "Already have access? Sign in" : "First setup? Create account"}
        </button>
      </section>
    </main>
  );
}
