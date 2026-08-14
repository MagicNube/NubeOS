import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import "./ui.css";

export default function SelectControl({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={`select-control ui-select ${className}`.trim()}>
      {children}
      <ChevronDown aria-hidden="true" size={15} />
    </span>
  );
}
