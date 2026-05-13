import React from 'react';
import logoImage from '../assets/logo.jpg';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export default function Logo({ className = '', size = 'md', onClick }: LogoProps) {
  const sizes = {
    sm: 'h-10',
    md: 'h-16',
    lg: 'h-32'
  };

  // Using the exact attachment ID for the logo image provided by the user (Handshake version)
  const logoUrl = "/api/attachments/8f972044-8da1-4965-96a2-9742f155f464";

  return (
    <div 
      className={`inline-flex items-center ${onClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : 'img'}
      aria-label="Dar L'emploi Logo"
    >
      <img
        src={logoImage}
        alt="Dar L'emploi"
        className={`${sizes[size]} w-auto block object-contain`}
      />
    </div>
  );
}
