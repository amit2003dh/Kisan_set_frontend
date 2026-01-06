import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"
});

// Custom icons
const userIcon = L.divIcon({
  html: '<div style="background: #4285f4; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">👤</div>',
  iconSize: [30, 30],
  className: "user-marker"
});

const destinationIcon = L.divIcon({
  html: '<div style="background: #ea4335; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">📍</div>',
  iconSize: [30, 30],
  className: "destination-marker"
});

export default function LiveMap({ location, destination, useLiveLocation = false, onLocationUpdate }) {
  const [currentLocation, setCurrentLocation] = useState({ lat: 0, lng: 0 }); // Start with empty location
  const [watchId, setWatchId] = useState(null);
  const [locationError, setLocationError] = useState("");
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const mapRef = useRef(null);

  // Function to predict coordinates from address
  const predictCoordinates = async (address) => {
    if (!address) return null;
    
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        };
      }
    } catch (error) {
      console.error("Error predicting coordinates:", error);
    }
    return null;
  };

  // Auto-predict coordinates when destination address changes
  useEffect(() => {
    if (destination?.address && (!destination.lat || !destination.lng || (destination.lat === 0 && destination.lng === 0))) {
      predictCoordinates(destination.address).then(coords => {
        if (coords && onLocationUpdate) {
          onLocationUpdate({
            ...destination,
            lat: coords.lat,
            lng: coords.lng
          });
        }
      });
    }
  }, [destination?.address]);

  // Live location tracking
  useEffect(() => {
    if (useLiveLocation && navigator.geolocation) {
      console.log("🔄 Starting device GPS location tracking...");
      setIsGettingLocation(true);
      
      const options = {
        enableHighAccuracy: true,
        timeout: 15000, // Increased timeout for better GPS lock
        maximumAge: 0 // Force fresh location, no cache
      };

      // Get initial device position first
      console.log("🎯 Getting initial device GPS position...");
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy, altitude, heading, speed } = position.coords;
          const deviceLocation = { lat: latitude, lng: longitude };
          
          console.log("📍 Device GPS location received:", { 
            latitude, 
            longitude, 
            accuracy: `${accuracy}m`,
            altitude: altitude ? `${altitude}m` : 'N/A',
            heading: heading ? `${heading}°` : 'N/A',
            speed: speed ? `${speed}m/s` : 'N/A'
          });
          
          setCurrentLocation(deviceLocation);
          setLocationError("");
          setIsGettingLocation(false);
          
          // Update parent component with device location
          if (onLocationUpdate) {
            console.log("📤 Sending device location to parent:", deviceLocation);
            onLocationUpdate(deviceLocation);
          }
        },
        (error) => {
          console.error("❌ Device GPS error:", error);
          setIsGettingLocation(false);
          
          let errorMessage = "❌ Could not get your device location. ";
          switch(error.code) {
            case error.PERMISSION_DENIED:
              errorMessage += "Location permission denied. Please allow location access in your browser settings.";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage += "Device GPS is unavailable or turned off.";
              break;
            case error.TIMEOUT:
              errorMessage += "GPS signal timeout. Please try again with clear sky view.";
              break;
            default:
              errorMessage += "Please check your device GPS and browser location settings.";
              break;
          }
          
          setLocationError(errorMessage);
        },
        options
      );

      // Start continuous tracking for live updates
      const watchPosition = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, accuracy, altitude, heading, speed } = position.coords;
          const deviceLocation = { lat: latitude, lng: longitude };
          
          console.log("🔄 Live device GPS update:", { 
            latitude, 
            longitude, 
            accuracy: `${accuracy}m`,
            heading: heading ? `${heading}°` : 'N/A',
            speed: speed ? `${speed}m/s` : 'N/A'
          });
          
          setCurrentLocation(deviceLocation);
          setLocationError("");
          
          // Update parent component with live device location
          if (onLocationUpdate) {
            console.log("📤 Sending live device location to parent:", deviceLocation);
            onLocationUpdate(deviceLocation);
          }
        },
        (error) => {
          console.error("❌ Live GPS tracking error:", error);
          // Don't show error for continuous tracking errors, just log them
        },
        options
      );

      setWatchId(watchPosition);

      return () => {
        if (watchId) {
          console.log("🛑 Stopping device GPS tracking");
          navigator.geolocation.clearWatch(watchId);
        }
      };
    } else if (!useLiveLocation && location && (location.lat !== 0 && location.lng !== 0)) {
      console.log("📍 Using provided static location:", location);
      setCurrentLocation(location);
      setIsGettingLocation(false);
    } else {
      console.log("❌ Device GPS not available or not enabled");
      setIsGettingLocation(false);
      if (!navigator.geolocation) {
        setLocationError("❌ Your device or browser does not support GPS location services.");
      }
    }
  }, [useLiveLocation, location]);

  // Update map center when location changes
  useEffect(() => {
    if (mapRef.current && currentLocation.lat && currentLocation.lng) {
      mapRef.current.setView([currentLocation.lat, currentLocation.lng], 14);
    }
  }, [currentLocation]);

  if (!currentLocation?.lat || !currentLocation?.lng || (currentLocation.lat === 0 && currentLocation.lng === 0)) {
    return (
      <div style={{ 
        padding: "16px", 
        height: "100%", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        flexDirection: "column",
        gap: "16px",
        background: "var(--background)",
        borderRadius: "var(--border-radius-sm)"
      }}>
        <div style={{ fontSize: "48px" }}>
          {isGettingLocation ? "🔄" : "📍"}
        </div>
        <p style={{ textAlign: "center", color: "var(--text-secondary)" }}>
          {locationError || (isGettingLocation 
            ? "🔄 Getting your device GPS location..." 
            : (useLiveLocation 
              ? "📍 Waiting for GPS location..." 
              : "🚚 Location will be available once assigned"))}
        </p>
        {useLiveLocation && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "center" }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: "8px 16px",
                background: "var(--primary-blue)",
                color: "white",
                border: "none",
                borderRadius: "var(--border-radius-sm)",
                cursor: "pointer"
              }}
            >
              🔄 Retry GPS Location
            </button>
            <div style={{ fontSize: "12px", color: "var(--text-secondary)", textAlign: "center" }}>
              💡 Make sure GPS is enabled and you've allowed location access
            </div>
          </div>
        )}
        {destination?.address && (
          <p style={{ fontSize: "14px", textAlign: "center", color: "var(--text-primary)" }}>
            🏠 Destination: {destination.address}
          </p>
        )}
      </div>
    );
  }

  const route =
    destination?.lat && destination?.lng && destination.lat !== 0 && destination.lng !== 0
      ? [
          [currentLocation.lat, currentLocation.lng],
          [destination.lat, destination.lng]
        ]
      : [];

  return (
    <MapContainer
      center={[currentLocation.lat, currentLocation.lng]}
      zoom={14}
      style={{ height: "100%", width: "100%" }}
      ref={mapRef}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />

      {/* User/Partner Location */}
      <Marker 
        position={[currentLocation.lat, currentLocation.lng]} 
        icon={userIcon}
      >
        <Popup>
          <div style={{ textAlign: "center" }}>
            <strong>{useLiveLocation ? "👤 Your Location" : "🚚 Delivery Partner"}</strong>
            {useLiveLocation && (
              <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
                Live tracking enabled
              </div>
            )}
          </div>
        </Popup>
      </Marker>

      {/* Destination Address */}
      {destination && destination.lat !== 0 && destination.lng !== 0 && (
        <>
          <Marker 
            position={[destination.lat, destination.lng]} 
            icon={destinationIcon}
          >
            <Popup>
              <div style={{ textAlign: "center" }}>
                <strong>🏠 Destination</strong>
                <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
                  {destination.address}
                </div>
              </div>
            </Popup>
          </Marker>

          <Polyline 
            positions={route} 
            color="#2e7d32" 
            weight={3}
            opacity={0.7}
            dashArray="10, 10"
          />
        </>
      )}

      {/* Location accuracy circle for live tracking */}
      {useLiveLocation && (
        <Circle
          center={[currentLocation.lat, currentLocation.lng]}
          radius={50} // 50 meters accuracy
          fillColor="#4285f4"
          fillOpacity={0.1}
          color="#4285f4"
          weight={1}
        />
      )}
    </MapContainer>
  );
}
