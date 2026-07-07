import React, { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import FacebookIcon from "@/components/FacebookIcon";

var getReturnUrl = function() {
  var params = new URLSearchParams(window.location.search);
  return params.get("from_url") || params.get("returnUrl") || params.get("redirect") || params.get("next") || "/";
};

export default function Login() {
  var [email, setEmail] = useState("");
  var [password, setPassword] = useState("");
  var [error, setError] = useState("");
  var [loading, setLoading] = useState(false);

  var handleSubmit = async function(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      var result = await supabase.auth.signInWithPassword({ email: email, password: password });
      if (result.error) throw result.error;
      window.location.href = getReturnUrl();
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  var handleGoogle = async function() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + getReturnUrl(),
        queryParams: { prompt: 'select_account' },
      },
    });
  };

  var handleFacebook = async function() {
    await supabase.auth.signInWithOAuth({
      provider: "facebook",
      options: {
        redirectTo: window.location.origin + getReturnUrl(),
        queryParams: { auth_type: 'reauthenticate' },
      },
    });
  };

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle={<>Don't have an account?{" "}<Link to="/register" className="text-blue-600 font-semibold hover:underline">Create one</Link></>}
    >
      <Button type="button" variant="outline" className="w-full mb-3" onClick={handleGoogle}>
        <GoogleIcon className="h-5 w-5 mr-2" />
        Continue with Google
      </Button>

      <Button type="button" variant="outline" className="w-full mb-4" onClick={handleFacebook}>
        <FacebookIcon className="h-5 w-5 mr-2" />
        Continue with Facebook
      </Button>

      <div className="text-center text-sm text-gray-400 mb-4">or</div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Email</Label>
          <div className="relative mt-1">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input type="email" placeholder="you@example.com" className="pl-10" value={email} onChange={function(e) { setEmail(e.target.value); }} required />
          </div>
        </div>

        <div>
          <Label>Password</Label>
          <div className="relative mt-1">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input type="password" placeholder="Your password" className="pl-10" value={password} onChange={function(e) { setPassword(e.target.value); }} required />
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (<><Loader2 className="h-4 w-4 animate-spin mr-2" />Logging in...</>) : "Log in"}
        </Button>
      </form>

      <div className="text-center mt-4">
        <Link to="/forgot-password" className="text-sm text-blue-600 hover:underline">Forgot password?</Link>
      </div>
    </AuthLayout>
  );
}
