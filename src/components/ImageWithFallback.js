import React from "react";

const ImageWithFallback = ({ 
  src, 
  alt, 
  fallbackType = "default",
  style = {},
  className = "",
  ...props 
}) => {
  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
  
  // Get the full image URL
  const getImageUrl = (imageSrc) => {
    if (!imageSrc) return null;
    return imageSrc.startsWith("http") ? imageSrc : `${API_BASE_URL}${imageSrc}`;
  };

  // Get fallback content based on type
  const getFallbackContent = () => {
    switch (fallbackType) {
      case "crop":
        return {
          src: "https://via.placeholder.com/350x200/4caf50/ffffff?text=🌾+Crop+Image",
          icon: "🌾",
          gradient: "linear-gradient(135deg, #4caf50, #8bc34a)"
        };
      case "product":
        return {
          src: "https://via.placeholder.com/350x200/2196f3/ffffff?text=🛒+Product+Image",
          icon: "🛒",
          gradient: "linear-gradient(135deg, #2196f3, #64b5f6)"
        };
      case "user":
        return {
          src: "https://via.placeholder.com/150x150/9e9e9e/ffffff?text=👤",
          icon: "👤",
          gradient: "linear-gradient(135deg, #9e9e9e, #bdbdbd)"
        };
      default:
        return {
          src: "https://via.placeholder.com/350x200/cccccc/666666?text=No+Image",
          icon: "📷",
          gradient: "linear-gradient(135deg, #cccccc, #e0e0e0)"
        };
    }
  };

  const imageUrl = getImageUrl(src);
  const fallback = getFallbackContent();

  const handleError = (e) => {
    // Try the fallback placeholder first
    if (e.target.src !== fallback.src) {
      e.target.src = fallback.src;
    } else {
      // If placeholder also fails, hide image and show icon
      e.target.style.display = "none";
      const parent = e.target.parentElement;
      if (parent && !parent.querySelector(".image-fallback")) {
        const fallbackDiv = document.createElement("div");
        fallbackDiv.className = "image-fallback";
        fallbackDiv.style.cssText = `
          width: ${style.width || "100%"};
          height: ${style.height || "200px"};
          display: flex;
          align-items: center;
          justify-content: center;
          background: ${fallback.gradient};
          color: white;
          font-size: ${style.fontSize || "48px"};
          border-radius: ${style.borderRadius || "var(--border-radius-sm)"};
          ${Object.entries(style).map(([key, value]) => `${key}: ${value}`).join("; ")}
        `;
        fallbackDiv.textContent = fallback.icon;
        parent.appendChild(fallbackDiv);
      }
    }
  };

  if (!imageUrl) {
    // Return fallback div if no image source
    return (
      <div 
        className={`image-fallback ${className}`}
        style={{
          background: fallback.gradient,
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: style.fontSize || "48px",
          ...style
        }}
        {...props}
      >
        {fallback.icon}
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      className={className}
      style={style}
      onError={handleError}
      {...props}
    />
  );
};

export default ImageWithFallback;
