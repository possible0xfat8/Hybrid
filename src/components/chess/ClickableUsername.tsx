import { useRouter } from 'next/navigation';

interface ClickableUsernameProps {
  username: string;
  walletAddress?: string | undefined;
  className?: string | undefined;
  children?: React.ReactNode;
}

/**
 * Reusable component that makes usernames clickable and navigates to user profile
 */
export function ClickableUsername({ username, walletAddress, className = '', children }: ClickableUsernameProps) {
  const router = useRouter();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (walletAddress) {
      router.push(`/user/${walletAddress}`);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`text-left hover:text-orange transition-colors cursor-pointer ${className}`}
      title={`View ${username}'s profile`}
    >
      {children || username}
    </button>
  );
}
