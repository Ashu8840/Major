import React, { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import {
  IoEye,
  IoEyeOff,
  IoMail,
  IoLockClosed,
  IoPersonOutline,
  IoSparkles,
  IoCheckmarkCircle,
  IoWarning,
  IoShield,
} from "react-icons/io5";

const Signup = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const { signup, loading } = useContext(AuthContext);
  const navigate = useNavigate();

  // Password validation
  const passwordRequirements = {
    minLength: formData.password.length >= 6,
    hasUpper: /[A-Z]/.test(formData.password),
    hasLower: /[a-z]/.test(formData.password),
    hasNumber: /\d/.test(formData.password),
  };

  // Username availability check
  // const checkUsernameAvailability = async (username) => {
  //   try {
  //     setUsernameChecking(true);
  //     const response = await fetch(
  //       `http://localhost:5000/api/users/check-username/${username}`
  //     );
  //     const data = await response.json();
  //     setUsernameAvailable(data.available);
  //   } catch (error) {
  //     console.error("Error checking username:", error);
  //     setUsernameAvailable(null);
  //   } finally {
  //     setUsernameChecking(false);
  //   }
  // };

  // Check username availability
  const checkUsernameAvailability = async (username) => {
    if (!username || username.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    setUsernameChecking(true);
    try {
      const response = await fetch(
        `http://localhost:5000/api/users/check-username/${username}`
      );
      const data = await response.json();
      setUsernameAvailable(data.available);
    } catch (error) {
      console.error("Error checking username:", error);
      setUsernameAvailable(null);
    } finally {
      setUsernameChecking(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }

    // Check username availability with debounce
    if (name === "username") {
      setUsernameAvailable(null);
      if (value.length >= 3) {
        // Clear previous timeout
        clearTimeout(window.usernameTimeout);
        // Set new timeout
        window.usernameTimeout = setTimeout(() => {
          checkUsernameAvailability(value);
        }, 500);
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username) {
      newErrors.username = "Username is required";
    } else if (formData.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    } else if (usernameAvailable === false) {
      newErrors.username = "Username is already taken";
    }

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (!Object.values(passwordRequirements).every((req) => req)) {
      newErrors.password = "Password must meet all requirements";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (!agreeTerms) {
      newErrors.terms = "Please accept the terms and conditions";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      const userData = await signup({
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });

      setMessage(
        "Account created successfully! Redirecting to profile setup..."
      );

      // Always redirect to settings for new users to complete profile
      setTimeout(() => {
        navigate("/settings");
      }, 1500);
    } catch (error) {
      setErrors({
        general:
          error.response?.data?.message || "Signup failed. Please try again.",
      });
    }
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Background with gradient animation */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-800 to-blue-900">
        <div className="absolute inset-0 bg-black/20"></div>
        {/* Animated background elements */}
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-20 right-20 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-40 left-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute bottom-20 right-1/3 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
        </div>
      </div>

      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:flex-1 relative z-10 items-center justify-center p-12">
        <div className="max-w-md text-center text-white">
          <div className="mb-8">
            <div className="w-20 h-20 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-6 border border-white/20">
              <IoSparkles className="w-10 h-10 text-purple-300" />
            </div>
            <h1 className="text-4xl font-bold mb-4">Start Your Journey</h1>
            <p className="text-xl text-purple-100">
              Join thousands of storytellers sharing their experiences
            </p>
          </div>

          <div className="space-y-6 text-left">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                <IoCheckmarkCircle className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Free Forever</h3>
                <p className="text-purple-200 text-sm">
                  Start writing with no hidden costs
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                <IoShield className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Privacy First</h3>
                <p className="text-purple-200 text-sm">
                  Your thoughts remain completely private
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                <IoSparkles className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">AI Assistant</h3>
                <p className="text-purple-200 text-sm">
                  Get writing help when you need it
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Signup form */}
      <div className="flex-1 flex items-center justify-center p-8 relative z-10">
        <div className="w-full max-w-md">
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border border-white/20">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-blue-900 mb-2">
                Create Account
              </h2>
              <p className="text-blue-600">
                Join our community of creative writers
              </p>
            </div>

            {/* Success Message */}
            {message && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
                <IoCheckmarkCircle className="w-5 h-5 text-green-600" />
                <span className="text-green-800 text-sm">{message}</span>
              </div>
            )}

            {/* General Error */}
            {errors.general && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                <IoWarning className="w-5 h-5 text-red-600" />
                <span className="text-red-800 text-sm">{errors.general}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Username Field */}
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-blue-900 mb-2"
                >
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <IoPersonOutline className="h-5 w-5 text-blue-400" />
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    value={formData.username}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-10 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                      errors.username
                        ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                        : usernameAvailable === false
                        ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                        : usernameAvailable === true
                        ? "border-green-300 focus:ring-green-500 focus:border-green-500"
                        : "border-blue-200 focus:ring-blue-500 focus:border-blue-500"
                    } bg-blue-50/50`}
                    placeholder="Choose a username"
                  />
                  {/* Username availability indicator */}
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    {usernameChecking && (
                      <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                    )}
                    {!usernameChecking &&
                      usernameAvailable === true &&
                      formData.username.length >= 3 && (
                        <IoCheckmarkCircle className="h-5 w-5 text-green-500" />
                      )}
                    {!usernameChecking && usernameAvailable === false && (
                      <IoWarning className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                </div>
                {errors.username && (
                  <p className="mt-1 text-sm text-red-600">{errors.username}</p>
                )}
                {!errors.username &&
                  usernameAvailable === true &&
                  formData.username.length >= 3 && (
                    <p className="mt-1 text-sm text-green-600">
                      Username is available!
                    </p>
                  )}
                {!errors.username && usernameAvailable === false && (
                  <p className="mt-1 text-sm text-red-600">
                    Username is already taken
                  </p>
                )}
              </div>

              {/* Email Field */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-blue-900 mb-2"
                >
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <IoMail className="h-5 w-5 text-blue-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-3 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                      errors.email
                        ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                        : "border-blue-200 focus:ring-blue-500 focus:border-blue-500"
                    } bg-blue-50/50`}
                    placeholder="Enter your email"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-blue-900 mb-2"
                >
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <IoLockClosed className="h-5 w-5 text-blue-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-12 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                      errors.password
                        ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                        : "border-blue-200 focus:ring-blue-500 focus:border-blue-500"
                    } bg-blue-50/50`}
                    placeholder="Create a password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <IoEyeOff className="h-5 w-5 text-blue-400 hover:text-blue-600" />
                    ) : (
                      <IoEye className="h-5 w-5 text-blue-400 hover:text-blue-600" />
                    )}
                  </button>
                </div>

                {/* Password Requirements */}
                {formData.password && (
                  <div className="mt-2 space-y-1">
                    <div
                      className={`flex items-center gap-2 text-xs ${
                        passwordRequirements.minLength
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      <IoCheckmarkCircle className="w-3 h-3" />
                      At least 6 characters
                    </div>
                    <div
                      className={`flex items-center gap-2 text-xs ${
                        passwordRequirements.hasUpper
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      <IoCheckmarkCircle className="w-3 h-3" />
                      One uppercase letter
                    </div>
                    <div
                      className={`flex items-center gap-2 text-xs ${
                        passwordRequirements.hasLower
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      <IoCheckmarkCircle className="w-3 h-3" />
                      One lowercase letter
                    </div>
                    <div
                      className={`flex items-center gap-2 text-xs ${
                        passwordRequirements.hasNumber
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      <IoCheckmarkCircle className="w-3 h-3" />
                      One number
                    </div>
                  </div>
                )}

                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                )}
              </div>

              {/* Confirm Password Field */}
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-blue-900 mb-2"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <IoLockClosed className="h-5 w-5 text-blue-400" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-12 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                      errors.confirmPassword
                        ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                        : "border-blue-200 focus:ring-blue-500 focus:border-blue-500"
                    } bg-blue-50/50`}
                    placeholder="Confirm your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showConfirmPassword ? (
                      <IoEyeOff className="h-5 w-5 text-blue-400 hover:text-blue-600" />
                    ) : (
                      <IoEye className="h-5 w-5 text-blue-400 hover:text-blue-600" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>

              {/* Terms and Conditions */}
              <div>
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-blue-300 rounded mt-1"
                  />
                  <span className="text-sm text-blue-700">
                    I agree to the{" "}
                    <Link
                      to="/terms"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link
                      to="/privacy"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      Privacy Policy
                    </Link>
                  </span>
                </label>
                {errors.terms && (
                  <p className="mt-1 text-sm text-red-600">{errors.terms}</p>
                )}
              </div>

              {/* Signup Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-700 text-white py-3 px-4 rounded-xl font-medium hover:from-purple-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Creating Account...
                  </div>
                ) : (
                  "Create Account"
                )}
              </button>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-blue-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-blue-500">
                    or continue with
                  </span>
                </div>
              </div>

              {/* Google Signup Button */}
              <button
                type="button"
                disabled={true}
                className="w-full border border-blue-200 text-blue-700 py-3 px-4 rounded-xl font-medium hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center justify-center gap-3">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google{" "}
                  <span className="text-xs">(Coming Soon)</span>
                </div>
              </button>
            </form>

            {/* Sign In Link */}
            <div className="mt-8 text-center">
              <p className="text-blue-600">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="font-semibold text-blue-700 hover:text-blue-900 transition-colors"
                >
                  Sign in here
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
z};

export default Signup;
