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
      <p className="helper">{target ? target + " · " : ""}Choose a pin or tap anywhere and name the place.</p>
      <div
        ref={element}
        className="place-map"
        role="region"
        aria-label="Interactive neighborhood map. Arrow keys pan; plus and minus zoom. Reviewed locations are available in the place selector."
      />
      {failed && (
        <p role="status" className="error">
          The map background could not load. Use the place selector or type a
          place below; your reflection still works.
        </p>
      )}
      {!target && <label className="map-location-label">Reviewed locations<select disabled={disabled} value={places.find(place => selected?.lat === place.coordinates.lat && selected?.lng === place.coordinates.lng)?.id || ""} onChange={event => { const place = places.find(item => item.id === event.target.value); if (place) choose.current(place.coordinates,place); }}><option value="">Choose a location, or tap the map</option>{places.map(place => <option key={place.id} value={place.id}>{place.label}</option>)}</select></label>}
      <p className="helper" role="status">
        {selected
          ? "Pin selected. Check the name in the place field."
          : "Pins are reference intersections, not project boundaries."}
      </p>
      <details className="helper"><summary>Map details</summary>{selected && <p>Reference coordinates: {selected.lat.toFixed(5)}, {selected.lng.toFixed(5)}</p>}<p>OpenStreetMap requires internet and receives the viewed area and your IP, not your reflection.</p></details>
    </section>
  );
}
