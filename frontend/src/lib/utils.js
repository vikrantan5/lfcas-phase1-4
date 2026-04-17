import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Return a displayable avatar URL for a user.
 * Priority:
 *   1. Explicit profile image on the user/advocate
 *   2. An auto-generated initials avatar (ui-avatars.com)
 */
export function getAvatarUrl(user, options = {}) {
  const { size = 100, background = '724AE3', color = 'fff' } = options;

  const explicit =
    user?.profile_image_url ||
    user?.profile_image ||
    user?.avatar_url ||
    user?.avatar ||
    user?.image_url ||
    null;

  if (explicit && typeof explicit === 'string' && explicit.trim() !== '') {
    return explicit;
  }

  const name =
    user?.full_name ||
    user?.name ||
    user?.client_name ||
    user?.email ||
    'User';

  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name
  )}&size=${size}&background=${background}&color=${color}&font-size=0.4&bold=true`;
}

/**
 * onError handler helper that swaps the failing image with a generated initials avatar.
 * Usage: onError={handleAvatarError(user)}
 */
export function handleAvatarError(user) {
  return (e) => {
    const fallback = getAvatarUrl({ full_name: user?.full_name || user?.name || 'User' });
    if (e?.target && e.target.src !== fallback) {
      e.target.onerror = null;
      e.target.src = fallback;
    }
  };
}
