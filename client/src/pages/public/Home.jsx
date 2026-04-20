import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, ShieldCheck, Sparkles, Wine, MessageCircle } from "lucide-react";
import toast from "react-hot-toast";
import MandalaBackground from "../../components/common/MandalaBackground";
import EthnicDivider from "../../components/common/EthnicDivider";
import Button from "../../components/common/Button";
import RoomCard from "../../components/room/RoomCard";
import NashikMapWidget from "../../components/common/NashikMapWidget";
import InputField from "../../components/forms/InputField";
import { useHomeData } from "../../hooks/useRooms";

export default function Home() {
  const navigate = useNavigate();
  const { data } = useHomeData();
  const [search, setSearch] = useState({
    destination: "Nashik, Maharashtra",
    checkIn: "",
    checkOut: "",
    guests: 2,
  });

  const experiences = [
    "Kumbh Mela",
    "Godavari Aarti",
    "Sula Wine Tour",
    "Panchavati Temple",
    "Trimbakeshwar",
    "Pandavleni Caves",
    "Nashik Fort Trek",
    "Grape Farm Visit",
  ];

  return (
    <div className="relative">
      {/* Floating WhatsApp Chat */}
      <a 
        href="https://wa.me/9102534447777" 
        target="_blank" 
        rel="noopener noreferrer"
        className="fixed bottom-8 right-8 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-2xl transition-transform hover:scale-110 active:scale-95 btn-hover-effect"
      >
        <MessageCircle size={32} />
      </a>

      {/* Hero Section */}
      <section className="relative h-[88vh] w-full overflow-hidden">
        <img
          src="/assets/images/mainimage.jpg"
          alt="Panchavati Grand - Nashik"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 flex items-center" style={{ background: "linear-gradient(to right, rgba(10,77,52,0.75) 40%, rgba(10,77,52,0.2))" }}>
          <div className="container-shell w-full text-white">
            <div className="max-w-2xl">
              <p className="text-sm font-bold uppercase tracking-[0.3em] mb-4" style={{ color: "#a7f3d0" }}>The Nashik Collection</p>
              <h1 className="font-heading text-5xl md:text-6xl font-bold leading-tight text-white">
                Authentic stays in the heart of Maharashtra
              </h1>
              <p className="mt-6 text-lg leading-relaxed" style={{ color: "rgba(255,255,255,0.85)" }}>
                Heritage comfort, vineyard landscapes, and sacred Nashik — all from one beautiful address.
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <a href="/rooms"
                  className="inline-flex items-center justify-center px-8 py-3 rounded-lg text-sm font-bold transition-opacity hover:opacity-90"
                  style={{ backgroundColor: "#ffffff", color: "#0A4D34" }}
                >
                  View Our Rooms
                </a>
                <a href="#enquiry"
                  className="inline-flex items-center justify-center px-8 py-3 rounded-lg text-sm font-bold border-2 transition-opacity hover:opacity-90"
                  style={{ borderColor: "rgba(255,255,255,0.6)", color: "#ffffff" }}
                >
                  Contact Us
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Search */}
      <section className="-mt-16 relative z-10 container-shell">
        <div className="bg-white p-6 shadow-float rounded-xl border border-divider/20">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
             <InputField label="Where" value={search.destination} onChange={(event) => setSearch({ ...search, destination: event.target.value })} />
             <InputField label="Check-in" type="date" value={search.checkIn} onChange={(event) => setSearch({ ...search, checkIn: event.target.value })} />
             <InputField label="Check-out" type="date" value={search.checkOut} onChange={(event) => setSearch({ ...search, checkOut: event.target.value })} />
             <Button variant="primary" className="w-full h-11" onClick={() => navigate(`/rooms?checkIn=${search.checkIn}&checkOut=${search.checkOut}&guests=${search.guests}`)}>
               Find Your Stay
             </Button>
          </div>
        </div>
      </section>

      {/* Featured Experiences */}
      <section className="container-shell py-24">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12">
          <div className="max-w-xl">
            <h2 className="font-heading text-4xl font-bold text-primary">Curated Nashik Moments</h2>
            <p className="mt-4 text-mutedText text-lg leading-relaxed">From the sacred ghats and historic temples to the serene vineyards, explore the best of Nashik's soul from our central location.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { title: "Sacred Ramkund", image: "/assets/images/ramkund.jpg", desc: "Experience the spiritual energy of the Godavari." },
            { title: "Vineyard Haven", image: "/assets/images/vineyard.jpg", desc: "Sunset walks through lush green grapes." },
            { title: "Ancient Heritage", image: "/assets/images/ancientheritage.jpg", desc: "Rooms that tell a story of regional craft." },
          ].map((item) => (
            <div key={item.title} className="group cursor-pointer" onClick={() => navigate('/rooms')}>
              <div className="overflow-hidden rounded-xl h-[400px] mb-6">
                <img src={item.image} alt={item.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
              </div>
              <h3 className="font-heading text-2xl text-primary font-bold">{item.title}</h3>
              <p className="mt-2 text-mutedText leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats/Values Section */}
      <section className="bg-primary py-24 text-white">
        <div className="container-shell">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            {[
              { icon: ShieldCheck, title: "Curated Selection", desc: "Every room is hand-picked for quality." },
              { icon: MapPin, title: "Heritage Location", desc: "Perfectly placed for exploration." },
              { icon: Sparkles, title: "Clean Design", desc: "Simple, elegant, and peaceful." },
              { icon: Wine, title: "Local Soul", desc: "Authentic food and local guides." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="space-y-4">
                <Icon size={32} className="text-secondaryLight/50" />
                <h4 className="font-heading text-xl font-bold">{title}</h4>
                <p className="text-white/70 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Room Showcase */}
      <section className="container-shell py-24">
        <div className="text-center mb-16">
          <h2 className="font-heading text-4xl font-bold text-primary">Discover Our Accommodations</h2>
          <div className="mt-4 h-[1px] w-24 bg-primary/20 mx-auto"></div>
        </div>
        <div className="grid gap-12 lg:grid-cols-4">
          {(data?.featuredRooms || []).map((room) => (
            <RoomCard key={room.id} room={room} compact />
          ))}
        </div>
        <div className="mt-16 text-center">
          <Button variant="outline" onClick={() => navigate('/rooms')} className="px-12">Browse Full Collection</Button>
        </div>
      </section>

      {/* Large Featured Block */}
      <section className="container-shell py-12">
        <div className="grid md:grid-cols-2 gap-0 rounded-2xl overflow-hidden shadow-2xl">
          <div className="h-[500px]">
            <img src="/assets/images/vineyard.jpg" className="w-full h-full object-cover" alt="Vineyard" />
          </div>
          <div className="bg-primaryLight/50 p-16 flex flex-col justify-center">
            <h3 className="font-heading text-4xl font-bold text-primary italic">The Vineyard Retreat</h3>
            <p className="mt-6 text-darkText/80 text-lg leading-relaxed">Enjoy private vineyard tours and exclusive tastings directly through our concierge. A unique blend of heritage and vineyard luxury.</p>
            <Button className="mt-10 self-start px-8" onClick={() => navigate('/rooms')}>Book A Package</Button>
          </div>
        </div>
      </section>

      {/* Final Call to Action Enquiry */}
      <section className="container-shell py-24">
        <div className="grid gap-16 lg:grid-cols-[1fr_0.8fr] items-center">
          <div className="space-y-8">
            <h2 className="font-heading text-5xl font-bold text-primary leading-tight">Can we help you plan your stay?</h2>
            <p className="text-xl text-mutedText leading-relaxed">Our concierge team is available 24/7 to assist with your journey to Nashik.</p>
            <div className="flex items-center gap-6">
               <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xl uppercase">PC</div>
               <div>
                 <p className="font-bold text-lg">Panchavati Concierge</p>
                 <p className="text-sm text-mutedText">Response within 15 minutes</p>
               </div>
            </div>
          </div>
          <div className="section-card p-10 bg-white" id="enquiry">
            <h3 className="font-heading text-2xl font-bold mb-8 text-primary">Quick Enquiry</h3>
            <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); toast.success("Enquiry sent! We will contact you soon."); }}>
              <InputField label="Name" placeholder="Full Name" required />
              <InputField label="Email" type="email" placeholder="example@email.com" required />
              <div className="space-y-1">
                 <span className="text-[10px] font-bold uppercase tracking-widest text-mutedText">Message</span>
                 <textarea className="w-full h-32 p-4 border border-divider rounded-lg outline-none focus:border-primary transition-colors resize-none font-sans" placeholder="Your requirements..." required></textarea>
              </div>
              <Button type="submit" variant="primary" className="w-full py-4 text-xs tracking-widest uppercase font-bold">Send Request</Button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}

