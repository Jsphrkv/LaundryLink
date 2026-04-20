import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, User, Phone } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "../../store/auth.store";
import { Button, Input } from "../../components/ui";
import { UserRole } from "../../types";

// ─── Login Page ───────────────────────────────────────────────────────────────
export function LoginPage() {
  const navigate = useNavigate();
  const { signIn, isLoading } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    try {
      await signIn(email.trim().toLowerCase(), password);
      toast.success("Welcome back!");
      // Navigation handled by router guard based on role
    } catch (err: any) {
      toast.error(err.message || "Invalid credentials");
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your LaundryLink account"
    >
      <form onSubmit={handleSubmit} className="space-y-1">
        <Input
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          leftIcon={<Mail size={16} />}
        />
        <Input
          label="Password"
          type={showPw ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Your password"
          autoComplete="current-password"
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

        <div className="text-right -mt-2 mb-2">
          <Link
            to="/forgot-password"
            className="text-xs text-primary hover:underline font-semibold"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" fullWidth size="lg" loading={isLoading}>
          Sign In
        </Button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-3 text-xs text-gray-400">
            New to LaundryLink?
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Customer", icon: "👤", role: "customer" },
          { label: "Rider", icon: "🛵", role: "rider" },
          { label: "Shop Owner", icon: "🏪", role: "shop_owner" },
        ].map((r) => (
          <Link
            key={r.role}
            to={`/register?role=${r.role}`}
            className="flex flex-col items-center gap-1 p-3 rounded-xl border-2 border-gray-100 hover:border-primary hover:bg-primary-50 transition-all"
          >
            <span className="text-xl">{r.icon}</span>
            <span className="text-xs font-semibold text-gray-600">
              {r.label}
            </span>
          </Link>
        ))}
      </div>
    </AuthLayout>
  );
}

// ─── Register Page ────────────────────────────────────────────────────────────
const ROLES = [
  {
    value: "customer",
    label: "Customer",
    icon: "👤",
    desc: "Book laundry pickups",
  },
  {
    value: "rider",
    label: "Rider",
    icon: "🛵",
    desc: "Deliver laundry orders",
  },
  {
    value: "shop_owner",
    label: "Shop Owner",
    icon: "🏪",
    desc: "List your laundry shop",
  },
];

export function RegisterPage() {
  const navigate = useNavigate();
  const { signUp, isLoading } = useAuthStore();
  const params = new URLSearchParams(window.location.search);

  const [role, setRole] = useState<UserRole>(
    (params.get("role") as UserRole) ?? "customer",
  );
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !phone || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    try {
      await signUp(
        email.trim().toLowerCase(),
        password,
        fullName.trim(),
        phone.trim(),
        role,
      );
      toast.success("Account created! Welcome to LaundryLink 🎉");
    } catch (err: any) {
      toast.error(err.message || "Registration failed");
    }
  };

  return (
    <AuthLayout title="Create account" subtitle="Join LaundryLink today">
      {/* Role selector */}
      <div className="mb-5">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
          I want to join as
        </p>
        <div className="grid grid-cols-3 gap-2">
          {ROLES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRole(r.value as UserRole)}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-center
                ${
                  role === r.value
                    ? "border-primary bg-primary-50"
                    : "border-gray-100 hover:border-gray-200"
                }`}
            >
              <span className="text-xl">{r.icon}</span>
              <span
                className={`text-xs font-bold ${role === r.value ? "text-primary" : "text-gray-600"}`}
              >
                {r.label}
              </span>
              <span className="text-[10px] text-gray-400 leading-tight">
                {r.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-1">
        <Input
          label="Full Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Juan dela Cruz"
          leftIcon={<User size={16} />}
        />
        <Input
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          leftIcon={<Mail size={16} />}
        />
        <Input
          label="Phone Number"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+63 912 345 6789"
          leftIcon={<Phone size={16} />}
        />
        <Input
          label="Password"
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
          label="Confirm Password"
          type={showPw ? "text" : "password"}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repeat your password"
          leftIcon={<Lock size={16} />}
        />

        <Button
          type="submit"
          fullWidth
          size="lg"
          loading={isLoading}
          className="mt-2"
        >
          Create Account
        </Button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-5">
        Already have an account?{" "}
        <Link to="/login" className="font-bold text-primary hover:underline">
          Sign In
        </Link>
      </p>
    </AuthLayout>
  );
}

// ─── Auth Layout wrapper ──────────────────────────────────────────────────────
function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-700 via-primary to-secondary p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur mb-3">
            <span className="text-3xl">🧺</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white">LaundryLink</h1>
          <p className="text-white/70 text-sm mt-1">
            Fresh clothes, delivered to you
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-6">
          <h2 className="text-2xl font-extrabold text-gray-900 mb-1">
            {title}
          </h2>
          <p className="text-sm text-gray-500 mb-6">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
