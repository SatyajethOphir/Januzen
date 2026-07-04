import React, { useState, useEffect, useCallback } from "react";
import { isPushSupported, subscribeToPush, unsubscribeFromPush, checkAndRefreshSubscription } from "../lib/push";

export interface UsePushNotificationsReturn {
  isSupported: boolean;
  permission: NotificationPermission | "unsupported";
  isSubscribed: boolean;
  isLoading: boolean;
  subscribe: (userId?: string) => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  checkStatus: () => Promise<void>;
  requestPermission: () => Promise<NotificationPermission>;
}

/**
 * Reusable React hook for Web Push permission and subscription management
 */
export function usePushNotifications(currentUser?: any): UsePushNotificationsReturn {
  const [supported, setSupported] = useState<boolean>(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const checkStatus = useCallback(async () => {
    if (!isPushSupported()) {
      setSupported(false);
      setPermission("unsupported");
      setIsSubscribed(false);
      setIsLoading(false);
      return;
    }

    setSupported(true);
    setPermission(Notification.permission);

    try {
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.ready;
        if ("pushManager" in registration) {
          const sub = await registration.pushManager.getSubscription();
          setIsSubscribed(!!sub);
        }
      }
    } catch (e) {
      console.error("[USE PUSH] Error checking subscription status:", e);
      setIsSubscribed(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Automatically subscribe or refresh subscription when an authenticated user logs in
  useEffect(() => {
    if (supported && permission === "granted" && currentUser) {
      checkAndRefreshSubscription(currentUser).then(() => {
        checkStatus();
      });
    }
  }, [supported, permission, currentUser, checkStatus]);

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isPushSupported()) return "denied";
    try {
      setIsLoading(true);
      const perm = await Notification.requestPermission();
      setPermission(perm);
      return perm;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const subscribe = useCallback(async (userId?: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const targetUserId = userId || currentUser?.id || (typeof currentUser === "string" ? currentUser : undefined);
      const success = await subscribeToPush(targetUserId);
      if (success) {
        setPermission("granted");
        setIsSubscribed(true);
      }
      return success;
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      const success = await unsubscribeFromPush();
      if (success) {
        setIsSubscribed(false);
      }
      return success;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isSupported: supported,
    permission,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
    checkStatus,
    requestPermission
  };
}
