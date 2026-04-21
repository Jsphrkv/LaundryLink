import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Eye, EyeOff, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import supabase from "../../services/supabase";
import { Button, Input } from "../../components/ui";

export default function ResetPasswordPage() {
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [validToken, setValidToken] = useState(false);
  const [checking, setChecking] = useState(true);

  // Supabase appends #access_token=...&type=recovery to the redirect URL.
  // detectSessionInUrl:true in the client means supabase.auth.getSession()
  // will automatically exchange the token and create a session.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setValidToken(true);
      }
      setChecking(false);
    });

    // Also listen for the AUTH_CHANGE event fired after token exchange
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setValidToken(true);
        setChecking(false);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      toast.success("Password updated successfully!");
      // Sign out so user logs in fresh with new password
      await supabase.auth.signOut();
    } catch (err: any) {
      toast.error(err.message || "Could not update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-700 via-primary to-secondary p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur mb-3">
            <span className="text-3xl">🧺</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white">LaundryLink</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6">
          {/* Loading state while verifying token */}
          {checking && (
            <div className="text-center py-8">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-500 text-sm font-medium">
                Verifying reset link…
              </p>
            </div>
          )}

          {/* Invalid / expired token */}
          {!checking && !validToken && (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">⚠️</span>
              </div>
              <h2 className="text-xl font-extrabold text-gray-900 mb-2">
                Link Expired or Invalid
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                This password reset link has expired or already been used.
                Please request a new one.
              </p>
              <Button fullWidth onClick={() => navigate("/forgot-password")}>
                Request New Link
              </Button>
              <button
                onClick={() => navigate("/login")}
                className="block mt-3 text-sm font-bold text-primary hover:underline text-center w-full"
              >
                ← Back to Sign In
              </button>
            </div>
          )}

          {/* Success state */}
          {done && (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-green-500" />
              </div>
              <h2 className="text-xl font-extrabold text-gray-900 mb-2">
                Password Updated!
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                Your password has been changed. Sign in with your new password.
              </p>
              <Button fullWidth onClick={() => navigate("/login")}>
                Sign In Now
              </Button>
            </div>
          )}

          {/* Reset form */}
          {!checking && validToken && !done && (
            <>
              <h2 className="text-2xl font-extrabold text-gray-900 mb-1">
                Set New Password
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                Choose a strong password for your LaundryLink account.
              </p>

              <form onSubmit={handleSubmit}>
                <Input
                  label="New Password"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  leftIcon={<Lock size={16} />}
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  }
                />
                <Input
                  label="Confirm New Password"
                  type={showPw ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat your new password"
                  leftIcon={<Lock size={16} />}
                />

                {/* Password strength hint */}
                {password.length > 0 && (
                  <div className="mb-4 -mt-2">
                    <div className="flex gap-1 mb-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            password.length >= i * 3
                              ? i <= 1
                                ? "bg-red-400"
                                : i <= 2
                                  ? "bg-amber-400"
                                  : i <= 3
                                    ? "bg-blue-400"
                                    : "bg-green-500"
                              : "bg-gray-200"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-gray-400">
                      {password.length < 8
                        ? "Too short — minimum 8 characters"
                        : password.length < 12
                          ? "Fair — consider adding more characters"
                          : "Strong password ✓"}
                    </p>
                  </div>
                )}

                <Button type="submit" fullWidth size="lg" loading={loading}>
                  Update Password
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
