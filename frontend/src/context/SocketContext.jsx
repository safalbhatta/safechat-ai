import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import api from "../lib/api.js";

const DEFAULT_NOTIFICATION_PREFERENCES = {
  enabled: true,
  newMessages: true,
  reactions: true,
  contactRequests: true,
  friendUpdates: true,
  accountActivity: true,
  sound: true,
  desktop: true,
};

const SocketContext = createContext(null);

export function useSocket() {
  return useContext(SocketContext);
}

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);
  const [notificationPreferences, setNotificationPreferences] = useState(
    DEFAULT_NOTIFICATION_PREFERENCES
  );

  const loadNotifications = useCallback(async (params = {}) => {
    const response = await api.get("/notifications", { params });
    const payload = response.data || {};
    setNotifications(payload.items || []);
    setNotificationUnreadCount(payload.unreadCount || 0);
    return payload;
  }, []);

  const loadNotificationSettings = useCallback(async () => {
    const [countResponse, preferencesResponse] = await Promise.all([
      api.get("/notifications/unread-count"),
      api.get("/notifications/preferences"),
    ]);

    setNotificationUnreadCount(countResponse.data?.unreadCount || 0);
    setNotificationPreferences({
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      ...(preferencesResponse.data || {}),
    });
  }, []);

  const markNotificationRead = useCallback(async (notificationId) => {
    if (!notificationId) return null;
    const response = await api.patch(`/notifications/${notificationId}/read`);
    setNotifications((current) =>
      current.map((item) =>
        item._id === notificationId
          ? { ...item, isRead: true, readAt: response.data?.readAt || new Date().toISOString() }
          : item
      )
    );
    setNotificationUnreadCount((count) => Math.max(0, count - 1));
    return response.data;
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    await api.patch("/notifications/mark-all-read");
    const now = new Date().toISOString();
    setNotifications((current) =>
      current.map((item) => ({ ...item, isRead: true, readAt: item.readAt || now }))
    );
    setNotificationUnreadCount(0);
  }, []);

  const deleteNotification = useCallback(async (notificationId) => {
    if (!notificationId) return;
    await api.delete(`/notifications/${notificationId}`);
    setNotifications((current) => {
      const removed = current.find((item) => item._id === notificationId);
      if (removed && !removed.isRead) {
        setNotificationUnreadCount((count) => Math.max(0, count - 1));
      }
      return current.filter((item) => item._id !== notificationId);
    });
  }, []);

  const clearReadNotifications = useCallback(async () => {
    await api.delete("/notifications/clear-read");
    setNotifications((current) => current.filter((item) => !item.isRead));
  }, []);

  const saveNotificationPreferences = useCallback(async (nextPreferences) => {
    const response = await api.put("/notifications/preferences", nextPreferences);
    const merged = {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      ...(response.data || {}),
    };
    setNotificationPreferences(merged);
    return merged;
  }, []);

  useEffect(() => {
    const user = JSON.parse(sessionStorage.getItem("user") || "null");
    const currentUserId = user?._id || user?.id;

    if (!currentUserId) return;

    loadNotificationSettings().catch((error) => {
      console.error("Failed to load notification settings:", error);
    });

    const newSocket = io(
      import.meta.env.VITE_BACKEND_BASE_URL || "http://localhost:5002",
      { transports: ["websocket", "polling"] }
    );

    newSocket.on("connect", () => {
      newSocket.emit("addUser", currentUserId);
    });

    newSocket.on("getOnlineUsers", (users) => {
      setOnlineUsers(users);
    });

    newSocket.on("sessionRevoked", (revokedToken) => {
      const currentToken = sessionStorage.getItem("token");
      if (currentToken === revokedToken) {
        sessionStorage.clear();
        window.location.href = "/login";
      }
    });

    newSocket.on("notification:new", (notification) => {
      setNotifications((current) => {
        if (current.some((item) => item._id === notification._id)) return current;
        return [notification, ...current];
      });
      setNotificationUnreadCount((count) => count + 1);
      window.dispatchEvent(
        new CustomEvent("safechat:notification", { detail: notification })
      );
    });

    newSocket.on("notification:updated", ({ notificationId, body }) => {
      setNotifications((current) =>
        current.map((item) =>
          item._id === notificationId ? { ...item, body } : item
        )
      );
    });

    newSocket.on("notification:read", ({ notificationId }) => {
      setNotifications((current) =>
        current.map((item) =>
          item._id === notificationId
            ? { ...item, isRead: true, readAt: item.readAt || new Date().toISOString() }
            : item
        )
      );
    });

    newSocket.on("notification:chat-read", ({ chatId, readAt }) => {
      setNotifications((current) =>
        current.map((item) => {
          const itemChatId = item.chatId?._id || item.chatId;
          return item.type === "message" && itemChatId === chatId
            ? { ...item, isRead: true, readAt: item.readAt || readAt }
            : item;
        })
      );
    });

    newSocket.on("notification:all-read", () => {
      const now = new Date().toISOString();
      setNotifications((current) =>
        current.map((item) => ({ ...item, isRead: true, readAt: item.readAt || now }))
      );
      setNotificationUnreadCount(0);
    });

    newSocket.on("notification:deleted", ({ notificationId }) => {
      setNotifications((current) =>
        current.filter((item) => item._id !== notificationId)
      );
    });

    newSocket.on("notification:cleared-read", () => {
      setNotifications((current) => current.filter((item) => !item.isRead));
    });

    newSocket.on("notification:count", ({ unreadCount }) => {
      setNotificationUnreadCount(Math.max(0, Number(unreadCount) || 0));
    });

    newSocket.on("notification:preferences", (preferences) => {
      setNotificationPreferences({
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        ...(preferences || {}),
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [loadNotificationSettings]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        onlineUsers,
        notifications,
        notificationUnreadCount,
        notificationPreferences,
        loadNotifications,
        markNotificationRead,
        markAllNotificationsRead,
        deleteNotification,
        clearReadNotifications,
        saveNotificationPreferences,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}
