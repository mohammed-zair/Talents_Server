import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = "" }) => {
  return (
    <div className={`glass-card rounded-2xl border p-5 shadow-soft-ambient ${className}`}>
      {children}
    </div>
  );
};

export default Card;
