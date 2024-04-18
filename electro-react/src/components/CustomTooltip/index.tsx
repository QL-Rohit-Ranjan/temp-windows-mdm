import { useState } from "react";
import style from "./CustomTooltip.module.css";
import { CustomTooltipInterface } from "./CustomTooltip";

const CustomTooltip = ({ text, children }: CustomTooltipInterface) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      className={style.custom_tooltip_container}
    >
      {children}
      {showTooltip && <div className={style.custom_tooltip}>{text}</div>}
    </div>
  );
};

export default CustomTooltip;
