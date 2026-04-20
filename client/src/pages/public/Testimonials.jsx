import { useQuery } from "@tanstack/react-query";
import PageHeader from "../../components/common/PageHeader";
import { feedbackAPI } from "../../api/feedbackAPI";

export default function Testimonials() {
  const { data, isLoading } = useQuery({
    queryKey: ["published-testimonials"],
    queryFn: () => feedbackAPI.published(),
  });

  const testimonials = data?.data || [];

  return (
    <div className="container-shell py-10">
      <PageHeader eyebrow="Guest Reviews" title="What travelers remember most" description="Published guest stories from direct bookings, family stays, and festival-season visits." />
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {isLoading ? <p className="text-mutedText">Loading reviews...</p> : null}
        {testimonials.map((item) => (
          <div key={item.id} className="section-card p-6">
            <p className="font-subheading text-2xl text-gold">{"★".repeat(item.rating || 0)}</p>
            <p className="mt-4 text-mutedText">{item.comment}</p>
            <p className="mt-6 font-semibold">{item.cust_name}</p>
            <p className="text-sm text-mutedText">{item.room_category || "Guest stay"}</p>
          </div>
        ))}
        {!isLoading && testimonials.length === 0 ? <p className="text-mutedText">No guest reviews have been published yet.</p> : null}
      </div>
    </div>
  );
}

/*
import { useQuery } from "@tanstack/react-query";
import PageHeader from "../../components/common/PageHeader";
import { feedbackAPI } from "../../api/feedbackAPI";

export default function Testimonials() {
  const { data, isLoading } = useQuery({
    queryKey: ["published-testimonials"],
    queryFn: () => feedbackAPI.published(),
  });

  const testimonials = data?.data || [];

  return (
    <div className="container-shell py-10">
      <PageHeader eyebrow="Guest Reviews" title="What travelers remember most" description="Published guest stories from direct bookings, family stays, and festival-season visits." />
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {isLoading ? <p className="text-mutedText">Loading reviews...</p> : null}
        {testimonials.map((item) => (
          <div key={item.id} className="section-card p-6">
            <p className="font-subheading text-2xl text-gold">★★★★★</p>
            <p className="mt-4 text-mutedText">{item.comment}</p>
            <p className="mt-6 font-semibold">{item.cust_name}</p>
            <p className="text-sm text-mutedText">{item.room_category} • {item.nationality}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
*/
