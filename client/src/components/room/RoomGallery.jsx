import { useState } from "react";
import Lightbox from "yet-another-react-lightbox";

export default function RoomGallery({ images = [] }) {
  const [index, setIndex] = useState(-1);
  const gallery = images.length ? images : ["/assets/images/placeholder-room.svg"];

  return (
    <>
      <div className="space-y-3">
        <img
          src={gallery[0]}
          alt="Room"
          className="h-80 w-full rounded-[28px] object-cover shadow-ethnic"
          onClick={() => setIndex(0)}
        />
        <div className="grid grid-cols-4 gap-3">
          {gallery.slice(0, 4).map((image, imageIndex) => (
            <button key={imageIndex} type="button" onClick={() => setIndex(imageIndex)}>
              <img src={image} alt="" className="h-20 w-full rounded-2xl object-cover" />
            </button>
          ))}
        </div>
      </div>
      <Lightbox open={index >= 0} close={() => setIndex(-1)} index={index} slides={gallery.map((src) => ({ src }))} />
    </>
  );
}
