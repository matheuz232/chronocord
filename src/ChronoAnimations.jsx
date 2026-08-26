import React from "react";

const TYPES = new Set(["circle", "dots", "fade", "ball", "time", "wifi", "icon"]);

export default function ChronoAnimation({
  type = "circle",
  size = 28,
  color = "currentColor",
  speed = 1,
  label,
  className = "",
}) {
  const safeType = TYPES.has(type) ? type : "circle";
  const style = { "--cc-anim-size": `${size}px`, "--cc-anim-color": color, "--cc-anim-duration": `${Math.max(0.45, Number(speed) || 1)}s` };
  const aria = label || "Carregando";
  if (safeType === "dots") return <span className={`cc-anim cc-anim-dots ${className}`} style={style} role="status" aria-label={aria}><i/><i/><i/></span>;
  if (safeType === "fade") return <span className={`cc-anim cc-anim-fade ${className}`} style={style} role="status" aria-label={aria}><i/><i/><i/><i/></span>;
  if (safeType === "ball") return <span className={`cc-anim cc-anim-ball ${className}`} style={style} role="status" aria-label={aria}><i/></span>;
  if (safeType === "time") return <span className={`cc-anim cc-anim-time ${className}`} style={style} role="status" aria-label={aria}><span className="cc-time-ring"><i/><b/></span></span>;
  if (safeType === "wifi") return <span className={`cc-anim cc-anim-wifi ${className}`} style={style} role="status" aria-label={aria}><i className="r1"/><i className="r2"/><i className="r3"/><b/></span>;
  if (safeType === "icon") return <span className={`cc-anim cc-anim-icon ${className}`} style={style} role="status" aria-label={aria}><b>⌁</b></span>;
  return <span className={`cc-anim cc-anim-circle ${className}`} style={style} role="status" aria-label={aria}><i/></span>;
}

export function ChronoAnimationGrid({ color = "#9B4DFF" }) {
  return <div className="cc-animation-grid">
    {["circle", "dots", "fade", "ball", "time", "wifi", "icon"].map((type) => <div className="cc-animation-grid-item" key={type}><ChronoAnimation type={type} size={30} color={color}/><span>{type}</span></div>)}
  </div>;
}
