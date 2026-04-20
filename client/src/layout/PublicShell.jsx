import { MessageCircle } from "lucide-react";
import { Outlet } from "react-router-dom";
import Navbar from "../components/common/Navbar";
import Footer from "../components/common/Footer";

export default function PublicShell() {
  const whatsapp = import.meta.env.VITE_HOTEL_WHATSAPP || "919999999999";
  return (
    <div>
      <Navbar />
      <main>
        <Outlet />
      </main>
      <Footer />
      <a
        href={`https://wa.me/${whatsapp}?text=Hello!%20I'd%20like%20to%20enquire%20about%20room%20booking%20at%20Panchavati%20Grand,%20Nashik`}
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-5 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg hover:scale-110 transition-transform"
      >
        <MessageCircle size={24} />
      </a>
    </div>
  );
}

