import { GoogleMap, Marker, useLoadScript } from "@react-google-maps/api";

export default function LiveMap({ location }) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_KEY || ""
  });

  if (loadError) {
    return (
      <div style={{
        height: "400px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--background)",
        borderRadius: "var(--border-radius-sm)",
        color: "var(--text-secondary)"
      }}>
        <div style={{ textAlign: "center", padding: "20px" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🗺️</div>
          <p>Failed to load map. Please check your Google Maps API key.</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div style={{
        height: "400px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--background)",
        borderRadius: "var(--border-radius-sm)"
      }}>
        <div style={{ textAlign: "center" }}>
          <div className="loading-spinner"></div>
          <p style={{ color: "var(--text-secondary)", marginTop: "16px" }}>Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <GoogleMap
      zoom={15}
      center={location}
      mapContainerStyle={{ height: "100%", width: "100%", borderRadius: "var(--border-radius-sm)" }}
      options={{
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: true,
      }}
    >
      <Marker 
        position={location}
        icon={{
          url: "http://maps.google.com/mapfiles/ms/icons/green-dot.png"
        }}
      />
    </GoogleMap>
  );
}
