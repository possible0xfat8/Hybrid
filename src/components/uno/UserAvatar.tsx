import React, { useState, useEffect } from 'react';

export interface UserAvatarProps {
  avatar?: string;
  name?: string;
  className?: string;
  fallback?: string;
  imgClassName?: string;
}

export const isAvatarUrl = (avatar?: string): boolean => {
  if (!avatar) return false;
  return (
    avatar.startsWith('http://') ||
    avatar.startsWith('https://') ||
    avatar.startsWith('data:image/') ||
    avatar.startsWith('/')
  );
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  avatar,
  name,
  className = 'w-9 h-9 text-base rounded-full',
  fallback = '🦊',
  imgClassName = 'w-full h-full object-cover',
}) => {
  const [hasError, setHasError] = useState(false);
  const isUrl = isAvatarUrl(avatar);

  // Reset error state if avatar prop changes
  useEffect(() => {
    setHasError(false);
  }, [avatar]);

  const roundedClass = className.includes('rounded-') ? '' : 'rounded-full';

  if (isUrl && !hasError) {
    return (
      <div className={`relative overflow-hidden shrink-0 flex items-center justify-center ${roundedClass} ${className}`}>
        <img
          src={avatar}
          alt={name || 'Avatar'}
          onError={() => setHasError(true)}
          className={`${roundedClass} ${imgClassName}`}
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <span className={`inline-flex items-center justify-center shrink-0 select-none ${className}`}>
      {avatar && !isUrl ? avatar : fallback}
    </span>
  );
};
