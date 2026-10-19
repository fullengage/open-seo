import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAppForm } from "@/client/components/form/useAppForm";
import { Button } from "@/client/components/ui/button";
import {
  AuthPageCard,
  AuthMethodChooser,
  authInputClassName,
  authSubmitClassName,
  authRedirectSearchSchema,
  useAuthPageState,
} from "@/client/features/auth/AuthPage";
import { useGoogleAuth } from "@/client/features/auth/useGoogleAuth";
import { getFormError } from "@/client/lib/forms";
import { captureClientEvent } from "@/client/lib/posthog";
import { authClient } from "@/lib/auth-client";
import {
  getSignInSearch,
  getVerifyEmailSearch,
  toAuthCallbackURL,
} from "@/lib/auth-redirect";
import { z } from "zod";

const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export const Route = createFileRoute("/_auth/sign-in")({
  validateSearch: authRedirectSearchSchema,
  component: SignInPage,
});

function SignInPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { redirectTo, oauthQuery, isHostedMode } = useAuthPageState(
    search.redirect,
  );
  const [showEmailForm, setShowEmailForm] = useState(false);
  const google = useGoogleAuth({ redirectTo });

  const form = useAppForm({
    defaultValues: {
      email: "",
      password: "",
    },
    validators: {
      onSubmit: signInSchema,
    },
    onSubmit: async ({ formApi, value }) => {
      try {
        const email = value.email.trim();
        captureClientEvent("auth:sign_in_submit", {
          redirect_to: redirectTo,
        });

        const result = await authClient.signIn.email({
          email,
          password: value.password,
          callbackURL: toAuthCallbackURL(redirectTo),
          ...(oauthQuery ? { oauth_query: oauthQuery } : {}),
        });

        if (!result.error) {
          captureClientEvent("auth:sign_in_success", {
            redirect_to: redirectTo,
          });
          return;
        }

        if (result.error.status === 403) {
          captureClientEvent("auth:sign_in_block_unverified", {
            redirect_to: redirectTo,
          });
          // Email not verified yet: send them to the verification page (which
          // shows "check your inbox" + resend) instead of leaving them on a
          // sign-in form that will keep rejecting them.
          void navigate({
            to: "/verify-email",
            search: getVerifyEmailSearch(email, redirectTo),
          });
          return;
        }

        formApi.setErrorMap({
          onSubmit: {
            form: result.error.message || "We couldn't sign you in.",
            fields: {},
          },
        });
      } catch {
        formApi.setErrorMap({
          onSubmit: {
            form: "Unable to sign in right now. Please try again.",
            fields: {},
          },
        });
      }
    },
  });

  return (
    <AuthPageCard
      title="Sign in"
      footer={
        isHostedMode ? (
          <div
            className={
              showEmailForm
                ? "flex w-full justify-between text-sm text-foreground/50"
                : "w-full text-sm text-foreground/50"
            }
          >
            {showEmailForm ? (
              <Link
                to="/forgot-password"
                search={getSignInSearch(redirectTo)}
                className="text-foreground underline underline-offset-2 hover:text-foreground/80 transition-colors"
              >
                Forgot password?
              </Link>
            ) : null}
            <Link
              to="/sign-up"
              search={getSignInSearch(redirectTo)}
              className="text-foreground underline underline-offset-2 hover:text-foreground/80 transition-colors"
            >
              Create account
            </Link>
          </div>
        ) : null
      }
    >
      {!isHostedMode ? (
        <LocalSignInForm redirectTo={redirectTo} />
      ) : !showEmailForm ? (
        <>
          <AuthMethodChooser
            googleLabel="Continue with Google"
            disabled={!isHostedMode}
            isBusy={google.isStarting}
            onContinueWithGoogle={() => {
              void google.start();
            }}
            onContinueWithEmail={() => {
              setShowEmailForm(true);
              google.clearError();
            }}
          />
          {google.error ? (
            <p className="text-sm text-destructive">{google.error}</p>
          ) : null}
        </>
      ) : (
        <form.AppForm>
          <form.Form className="space-y-4">
            <form.AppField name="email">
              {(field) => (
                <field.TextField
                  label="Email address"
                  hideLabel
                  className={authInputClassName}
                  type="email"
                  placeholder="Email address..."
                  autoComplete="email"
                  required
                />
              )}
            </form.AppField>
            <form.AppField name="password">
              {(field) => (
                <field.TextField
                  label="Password"
                  hideLabel
                  className={authInputClassName}
                  type="password"
                  placeholder="Password..."
                  autoComplete="current-password"
                  required
                />
              )}
            </form.AppField>

            <form.Subscribe
              selector={(state) => ({
                submitError: state.errorMap.onSubmit,
                isSubmitting: state.isSubmitting,
              })}
            >
              {({ submitError, isSubmitting }) => {
                const errorMessage = getFormError(submitError);
                return (
                  <>
                    {errorMessage ? (
                      <p className="text-sm text-destructive">{errorMessage}</p>
                    ) : null}
                    <Button
                      type="submit"
                      variant="secondary"
                      className={authSubmitClassName}
                      pending={isSubmitting}
                    >
                      {isSubmitting ? "Signing in..." : "Sign in"}
                    </Button>
                  </>
                );
              }}
            </form.Subscribe>
          </form.Form>
        </form.AppForm>
      )}
    </AuthPageCard>
  );
}

function LocalSignInForm({ redirectTo }: { redirectTo: string }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/sign-in/local", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json()) as { error?: { message?: string } };
      if (!res.ok || data.error) {
        setError(data.error?.message || "Senha incorreta.");
        setLoading(false);
        return;
      }
      window.location.href = redirectTo || "/";
    } catch {
      setError("Erro ao autenticar. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5 text-left">
        <label className="text-xs font-medium text-foreground/80">Usuário</label>
        <input
          type="text"
          value="admin@localhost"
          disabled
          className="w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground"
        />
      </div>
      <div className="space-y-1.5 text-left">
        <label className="text-xs font-medium text-foreground/80">Senha</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Digite sua senha..."
          autoFocus
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>
      {error ? (
        <p className="text-sm font-medium text-destructive">{error}</p>
      ) : null}
      <Button
        type="submit"
        className="w-full h-10 font-medium"
        variant="default"
        pending={loading}
      >
        {loading ? "Entrando..." : "Entrar no OpenSEO"}
      </Button>
    </form>
  );
}

