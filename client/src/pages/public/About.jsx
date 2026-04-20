import PageHeader from "../../components/common/PageHeader";

export default function About() {
  return (
    <div className="container-shell py-10">
      <PageHeader
        eyebrow="Why Nashik?"
        title="A hotel shaped by Godavari, vineyards, and temple stone"
        description="Panchavati Grand is designed around Nashik’s sacred riverfront, Kumbh energy, wine-country calm, and the heavy grace of Hemadpanthi architecture."
      />
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="section-card p-6">
          <h2 className="font-heading text-3xl">Why Nashik?</h2>
          <p className="mt-4 text-mutedText">
            Nashik sits at a rare intersection: pilgrimage city, Ramayana landscape, wine capital, and Sahyadri gateway. Our stay experience is built to hold all of that together.
          </p>
        </div>
        <div className="section-card p-6">
          <h2 className="font-heading text-3xl">Design Language</h2>
          <p className="mt-4 text-mutedText">
            Cream temple-wall tones, terracotta accents, saffron gradients, black-stone cues, and lotus motifs create a grounded but contemporary identity throughout the hotel.
          </p>
        </div>
      </div>
    </div>
  );
}

