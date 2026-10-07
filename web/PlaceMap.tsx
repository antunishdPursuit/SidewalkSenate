import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type Point = { lat: number; lng: number };
export type MapPlace = { id: string; label: string; coordinates: Point };
export default function PlaceMap({
  places,
  selected,
  onChoose,
  disabled = false,
  target,
}: {
  places: MapPlace[];
  selected?: Point;
  onChoose: (point: Point, place?: MapPlace) => void;
  disabled?: boolean;
  target?: string;
}) {
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const choose = useRef(onChoose);
  const blocked = useRef(disabled);
  const [failed, setFailed] = useState(false);
  choose.current = onChoose;
  blocked.current = disabled;
  useEffect(() => {
    if (!element.current) return;
    const view = L.map(element.current, {
      scrollWheelZoom: false,
      zoomAnimation: false,
      fadeAnimation: false,
      markerZoomAnimation: false,
      inertia: false,
    }).setView([40.7465, -73.944], 17);
    map.current = view;
    const tiles = L.tileLayer(
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
      },
    ).addTo(view);
    const missing = new Set<string>();
    const key = (event: L.TileEvent) =>
      [event.coords.z, event.coords.x, event.coords.y].join("/");
    tiles.on("tileerror", (event: L.TileErrorEvent) => {
      missing.add(key(event));
      setFailed(true);
    });
    const recovered = (event: L.TileEvent) => {
      missing.delete(key(event));
      setFailed(missing.size > 0);
    };
    tiles.on("tileload", recovered);
    tiles.on("tileunload", recovered);
    view.on("click", (event: L.LeafletMouseEvent) => {
      if (!blocked.current)
        choose.current({ lat: event.latlng.lat, lng: event.latlng.lng });
    });
    const resize = new ResizeObserver(() =>
      view.invalidateSize({ pan: false }),
    );
    resize.observe(element.current);
    return () => {
      resize.disconnect();
      view.remove();
      map.current = null;
    };
  }, []);
  useEffect(() => {
    if (!map.current) return;
    const layer = L.layerGroup().addTo(map.current);
    places.forEach((place, index) => {
      const marker = L.marker(place.coordinates, {
        title: place.label,
        alt: place.label,
        icon: L.divIcon({
          className: "reviewed-pin",
          html: String(index + 1),
          iconSize: [44, 44],
          iconAnchor: [22, 22],
        }),
      })
        .on("click", () => {
          if (!blocked.current) choose.current(place.coordinates, place);
        })
        .addTo(layer);
      marker.on("keydown", (event: L.LeafletEvent) => {
        const key = (event as L.LeafletEvent & { originalEvent: KeyboardEvent })
          .originalEvent;
        if (key.key === "Enter" || key.key === " ") {
          key.preventDefault();
          if (!blocked.current) choose.current(place.coordinates, place);
        }
      });
      marker.getElement()?.setAttribute("aria-label", place.label);
    });
    return () => {
      layer.remove();
    };
  }, [places]);
  useEffect(() => {
    if (!selected || !map.current) return;
    const marker = L.marker(selected, {
      interactive: false,
      keyboard: false,
      icon: L.divIcon({
        className: "selected-pin",
        html: '<span aria-hidden="true">×</span>',
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      }),
    }).addTo(map.current);
    return () => {
      marker.remove();
    };
  }, [selected]);
  return (
    <section className="map-panel" aria-label="Choose a place on the map">
      <div className="map-heading">
        <div>
          <p className="eyebrow">11101 · Long Island City</p>
          <h2>
            {target
              ? "Choose a place for " + target + "."
              : "Choose a place on the map."}
          </h2>
        </div>
        <span className="helper">Numbered pins = reviewed locations</span>
      </div>
      <p className="helper">
        Choose a numbered location below or on the map. You can also tap another
        point and name it in the place field. No location permission needed.
      </p>
      <div
        ref={element}
        className="place-map"
        role="region"
        aria-label="Interactive neighborhood map. Arrow keys pan; plus and minus zoom. Reviewed locations are also listed below."
      />
      {failed && (
        <p role="status" className="error">
          The map background could not load. Use the location buttons or type a
          place below; your reflection still works.
        </p>
      )}
      <div className="map-places" aria-label="Reviewed locations">
        {places.map((place, index) => (
          <button
            type="button"
            className="secondary"
            key={place.id}
            disabled={disabled}
            onClick={() => choose.current(place.coordinates, place)}
          >
            {index + 1}. {place.label}
          </button>
        ))}
      </div>
      <p className="helper" role="status">
        {selected
          ? "Pin selected. Check the name in the place field."
          : "Three reference intersections from one dated project, not project boundaries or all nearby proposals."}
      </p>
      {selected && (
        <p className="helper">
          Reference coordinates: {selected.lat.toFixed(5)},{" "}
          {selected.lng.toFixed(5)}
        </p>
      )}
      <p className="helper">
        Map background: OpenStreetMap (internet required). The provider receives
        the viewed area and your IP, not your reflection.
      </p>
    </section>
  );
}
