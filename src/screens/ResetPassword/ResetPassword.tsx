import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  LockIcon,
  ArrowRightIcon,
  PackageIcon,
  GiftIcon,
  MailIcon,
  Loader,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Card, CardContent } from "../../components/ui/card";
import authService from "../../services/authService";
import { useToast } from "../../components/ui/toast";

export const ResetPassword = (): JSX.Element => {
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    // Get phone number from session storage
    const storedPhone = sessionStorage.getItem('passwordResetPhone');
    
    if (!storedPhone) {
      // If no phone number in session, redirect to forgot password
      navigate("/forgot-password");
      return;
    }
    
    setPhoneNumber(storedPhone);
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!otp.trim()) {
      setError("Please enter the OTP code");
      return;
    }

    if (otp.length < 4) {
      setError("OTP code must be at least 4 characters");
      return;
    }

    if (!newPassword.trim()) {
      setError("Please enter a new password");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      // Get verificationId from session storage
      const verificationId = sessionStorage.getItem('passwordResetVerificationId');
      
      if (!verificationId) {
        setError("Verification session expired. Please request a new OTP.");
        setLoading(false);
        return;
      }
      
      const response = await authService.resetPassword(verificationId, otp.trim(), newPassword);
      
      if (response.success) {
        showToast(response.message || "Password reset successfully", "success");
        // Clear session storage
        sessionStorage.removeItem('passwordResetPhone');
        sessionStorage.removeItem('passwordResetVerificationId');
        // Redirect to login
        setTimeout(() => {
          navigate("/login");
        }, 1500);
      } else {
        setError(response.message);
        showToast(response.message, "error");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      showToast("An unexpected error occurred. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-orange-50 to-yellow-50 relative overflow-hidden">
      {/* Background Delivery Icons */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 opacity-20">
          <PackageIcon className="w-32 h-32 text-orange-400" />
        </div>
        <div className="absolute top-40 right-20 opacity-15">
          <GiftIcon className="w-40 h-40 text-blue-400" />
        </div>
        <div className="absolute bottom-20 left-20 opacity-20">
          <MailIcon className="w-36 h-36 text-yellow-400" />
        </div>
        <div className="absolute bottom-40 right-10 opacity-15">
          <PackageIcon className="w-28 h-28 text-orange-500" />
        </div>
        <div className="absolute top-1/2 left-1/4 opacity-10">
          <GiftIcon className="w-24 h-24 text-blue-500" />
        </div>
        <div className="absolute top-1/3 right-1/3 opacity-15">
          <MailIcon className="w-30 h-30 text-yellow-500" />
        </div>
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md rounded-2xl border border-[#d1d1d1] bg-white shadow-xl">
          <CardContent className="p-8">
            {/* Logo */}
            <div className="flex flex-col items-center mb-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-12 h-12 bg-[#ea690c] rounded-lg flex items-center justify-center">
                  <PackageIcon className="w-8 h-8 text-white" />
                </div>
                <span className="text-[#ea690c] font-bold text-xl">DELIVERY</span>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <span className="text-[#ea690c] font-bold text-2xl">Mealex & Mailex</span>
                  <span className="text-neutral-800 font-bold text-2xl">(M&M)</span>
                </div>
                <p className="text-neutral-600 text-sm">Parcel Delivery System</p>
              </div>
            </div>

            {/* Title */}
            <h1 className="font-body-lg-semibold font-[number:var(--body-lg-semibold-font-weight)] text-neutral-800 text-[length:var(--body-lg-semibold-font-size)] text-center mb-4">
              Reset Your Password
            </h1>

            {/* Instructions */}
            <p className="font-body-md font-[number:var(--body-md-font-weight)] text-[#5d5d5d] text-[length:var(--body-md-font-size)] text-center mb-6">
              Enter the OTP code sent to {phoneNumber ? `****${phoneNumber.slice(-4)}` : 'your phone'} and your new password.
            </p>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label className="[font-family:'Lato',Helvetica] font-semibold text-neutral-800 text-sm">
                  OTP Code<span className="text-[#e22420]">*</span>
                </Label>
                <Input
                  type="text"
                  placeholder="Enter OTP code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  required
                  className="w-full rounded border border-[#d1d1d1] bg-white px-3 py-2 [font-family:'Lato',Helvetica] font-normal text-neutral-700 placeholder:text-[#b0b0b0]"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label className="[font-family:'Lato',Helvetica] font-semibold text-neutral-800 text-sm">
                  New Password<span className="text-[#e22420]">*</span>
                </Label>
                <div className="relative">
                  <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9a9a9a]" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="pl-10 pr-3 w-full rounded-lg border border-[#d1d1d1] bg-white py-2.5 [font-family:'Lato',Helvetica] font-normal text-neutral-700 placeholder:text-[#b0b0b0] focus:outline-none focus:ring-2 focus:ring-[#ea690c] focus:border-[#ea690c] disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9a9a9a] hover:text-neutral-700"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <p className="text-xs text-[#5d5d5d] mt-1">
                  Password must be at least 6 characters
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="[font-family:'Lato',Helvetica] font-semibold text-neutral-800 text-sm">
                  Confirm Password<span className="text-[#e22420]">*</span>
                </Label>
                <div className="relative">
                  <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9a9a9a]" />
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="pl-10 pr-3 w-full rounded-lg border border-[#d1d1d1] bg-white py-2.5 [font-family:'Lato',Helvetica] font-normal text-neutral-700 placeholder:text-[#b0b0b0] focus:outline-none focus:ring-2 focus:ring-[#ea690c] focus:border-[#ea690c] disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9a9a9a] hover:text-neutral-700"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#ea690c] text-white hover:bg-[#ea690c]/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    <span className="[font-family:'Lato',Helvetica] font-semibold text-sm">
                      Resetting Password...
                    </span>
                  </>
                ) : (
                  <>
                    <span className="[font-family:'Lato',Helvetica] font-semibold text-sm">
                      Reset Password
                    </span>
                    <ArrowRightIcon className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Return to Login Link */}
            <div className="text-center mt-6">
              <Link
                to="/login"
                className="text-[#ea690c] hover:underline text-sm font-medium"
              >
                Return to login?
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

