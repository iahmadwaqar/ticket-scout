import { toast } from '@/hooks/use-toast.js';

/**
 * Notification service that handles both in-app toast notifications
 * and system-level notifications for the Electron application
 */

/**
 * Show a notification with both in-app toast and optional system notification
 */
export async function showNotification(options) {
  const {
    title,
    description,
    variant = 'default',
    action,
    showSystemNotification = false,
    systemTitle
  } = options;

  // Show in-app toast notification
  toast({
    title,
    description,
    variant,
    action,
  });

  // Show system notification if requested
  if (showSystemNotification && window.api?.showNotification) {
    try {
      await window.api.showNotification(
        systemTitle || title,
        description
      );
    } catch (error) {
      console.error('Failed to show system notification:', error);
    }
  }
}

/**
 * Show a success notification
 */
export async function showSuccessNotification(
  title,
  description,
  options = {}
) {
  await showNotification({
    title,
    description,
    variant: 'default',
    ...options,
  });
}

/**
 * Show an error notification
 */
export async function showErrorNotification(
  title,
  description,
  options = {}
) {
  await showNotification({
    title,
    description,
    variant: 'destructive',
    ...options,
  });
}

/**
 * Show a ticket success notification with system notification
 */
export async function showTicketSuccessNotification(profileName) {
  await showSuccessNotification(
    "Ticket Secured!",
    `${profileName} has successfully found a ticket.`,
    {
      showSystemNotification: false,
      systemTitle: "Ticket Scout - Success!",
    }
  );
}

/**
 * Show a profile error notification with system notification
 */
export async function showProfileErrorNotification(profileName) {
  await showErrorNotification(
    "Profile Error",
    `${profileName} encountered an error.`,
    {
      showSystemNotification: false,
      systemTitle: "Ticket Scout - Error",
    }
  );
}

/**
 * Show a system resource warning notification
 */
export async function showSystemWarningNotification(message) {
  await showNotification({
    title: "System Warning",
    description: message,
    variant: 'default',
    showSystemNotification: false,
    systemTitle: "Ticket Scout - Warning",
  });
}