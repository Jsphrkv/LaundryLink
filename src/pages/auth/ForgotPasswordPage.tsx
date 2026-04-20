import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import { authService } from "../../services/auth.service";
import { Button, Input } from "../../components/ui";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your email");
      return;
    }

    setLoading(true);
    try {
      await authService.resetPassword(email.trim().toLowerCase());
      setSent(true);
    } catch (err: any) {
      toast.error(err.message || "Could not send reset email");
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
          {!sent ? (
            <>
              <button
                onClick={() => navigate("/login")}
                className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 font-semibold mb-5 transition"
              >
                <ArrowLeft size={15} /> Back to Sign In
              </button>

              <h2 className="text-2xl font-extrabold text-gray-900 mb-1">
                Forgot Password?
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                Enter your email address and we'll send you a link to reset your
                password.
              </p>

              <form onSubmit={handleSubmit}>
                <Input
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  leftIcon={<Mail size={16} />}
                />
                <Button type="submit" fullWidth size="lg" loading={loading}>
                  Send Reset Link
                </Button>
              </form>

              <p className="text-center text-sm text-gray-400 mt-4">
                Remembered it?{" "}
                <Link
                  to="/login"
                  className="text-primary font-bold hover:underline"
                >
                  Sign In
                </Link>
              </p>
            </>
          ) : (
            // Success state
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-green-500" />
              </div>
              <h2 className="text-xl font-extrabold text-gray-900 mb-2">
                Check Your Email
              </h2>
              <p className="text-sm text-gray-500 mb-2">
                We sent a password reset link to:
              </p>
              <p className="text-sm font-bold text-primary mb-6">{email}</p>
              <p className="text-xs text-gray-400 mb-6">
                Didn't receive it? Check your spam folder or wait a few minutes.
              </p>
              <Button
                variant="ghost"
                fullWidth
                onClick={() => {
                  setSent(false);
                  setEmail("");
                }}
              >
                Try a different email
              </Button>
              <Link
                to="/login"
                className="block mt-3 text-sm font-bold text-primary hover:underline text-center"
              >
                ← Back to Sign In
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
