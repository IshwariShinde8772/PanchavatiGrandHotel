import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuthStore } from "../../store/authStore";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setAuth = useAuthStore((state) => state.setAuth);

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get("token");
      const provider = searchParams.get("provider");
      const error = searchParams.get("error");

      if (error) {
        toast.error(`Authentication failed: ${error}`);
        navigate("/login");
        return;
      }

      if (token) {
        try {
          // Decode token to get user info (simple decode, not verify)
          const payload = JSON.parse(atob(token.split(".")[1]));
          const user = {
            id: payload.id,
            role: payload.role,
            name: payload.name,
            phone: payload.phone,
          };

          setAuth({ token, user });
          toast.success(`Successfully signed in with ${provider}!`);
          navigate("/customer");
        } catch (err) {
          console.error("Token parsing error:", err);
          toast.error("Authentication failed");
          navigate("/login");
        }
      } else {
        toast.error("No authentication token received");
        navigate("/login");
      }
    };

    handleCallback();
  }, [searchParams, navigate, setAuth]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 mx-auto"></div>
        <p className="text-gray-600">Completing sign in...</p>
      </div>
    </div>
  );
}