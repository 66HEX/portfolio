import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./dock.css";
import {
  SlHome,
  SlSocialInstagram,
  SlFolder,
  SlCamera,
  SlUser,
} from "react-icons/sl";

const DockItem = ({
  IconComponent,
  path,
  isHovered,
  isNeighbor,
  onMouseEnter,
  external,
  label
}) => {
  const scale = isHovered ? 1.2 : isNeighbor ? 1 : 1;
  const margin = isHovered || isNeighbor ? "10px" : "10px";
  const linkStyle = { transform: `scale(${scale})`, margin: `0 ${margin}` };

  return (
    <div className="dock-item" style={linkStyle} onMouseEnter={onMouseEnter}>
      {external ? (
        <a href={path} target="_blank" rel="noopener noreferrer" aria-label={label}>
          <div className="dock-item-link-wrap">
            <IconComponent size="18px" style={{ color: "hsl(0, 0%, 60%)" }} />
          </div>
        </a>
      ) : (
        <Link to={path} aria-label={label}>
          <div className="dock-item-link-wrap">
            <IconComponent size="18px" style={{ color: "hsl(0, 0%, 60%)" }} />
          </div>
        </Link>
      )}
    </div>
  );
};

const Dock = () => {
  const [hoveredIndex, setHoveredIndex] = useState(-1);
  const [hoverEffectsEnabled, setHoverEffectsEnabled] = useState(
    window.innerWidth >= 900
  );

  useEffect(() => {
    const checkScreenSize = () => {
      const isEnabled = window.innerWidth >= 900;
      console.log(
        "Window width:",
        window.innerWidth,
        "Hover effects enabled:",
        isEnabled
      );
      setHoverEffectsEnabled(isEnabled);
    };

    checkScreenSize();

    window.addEventListener("resize", checkScreenSize);

    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  const handleMouseEnter = (index) => {
    if (hoverEffectsEnabled) {
      setHoveredIndex(index);
    }
  };

  const handleMouseLeave = () => {
    if (hoverEffectsEnabled) {
      setTimeout(() => {
        console.log(hoverEffectsEnabled);
        setHoveredIndex(-100);
      }, 50);
    }
  };

  useEffect(() => {
    console.log("Component mounted, hoveredIndex:", hoveredIndex);
    setTimeout(() => {
      setHoveredIndex(-100);
    }, 50);
  }, []);

  const icons = [
    { icon: SlHome, path: "/", label: "Home" },
    { icon: SlUser, path: "/about", label: "About" },
    { icon: SlCamera, path: "/photos", label: "Photos" },
    { icon: SlFolder, path: "/projects", label: "Projects" },
    {
      icon: SlSocialInstagram,
      path: "https://www.instagram.com/hexthecoder/",
      external: true,
      label: "Instagram"
    },
  ];

  return (
    <div className="dock-container" onMouseLeave={handleMouseLeave}>
      <div className="dock">
        {icons.map((item, index) => (
          <DockItem
            key={index}
            IconComponent={item.icon}
            path={item.path}
            isHovered={index === hoveredIndex}
            isNeighbor={Math.abs(index - hoveredIndex) === 1}
            onMouseEnter={() => handleMouseEnter(index)}
            external={item.external}
            label={item.label}
          />
        ))}
      </div>
    </div>
  );
};

export default Dock;
