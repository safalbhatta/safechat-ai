import { Outlet } from "react-router-dom";
import { useEffect, useRef } from "react";
import Sidebar from "../components/messaging/Sidebar.jsx";
import MobileNav from "../components/mobile/MobileNav.jsx";
import { useSocket } from "../context/SocketContext.jsx";
import api from "../lib/api.js";

let audioCtx = null;

const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
};

document.addEventListener('click', initAudio, { once: true });
document.addEventListener('keydown', initAudio, { once: true });

const playNotificationSound = () => {
  try {
    if (!audioCtx) initAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.2);
  } catch (e) {
    console.error("Audio play failed", e);
  }
};

export default function Layout() {
  const { notificationPreferences } = useSocket();
  const originalTitle = useRef(document.title);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        document.title = originalTitle.current;
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const fetchUser = async () => {
      try {
        const res = await api.get("/users/profile");
        sessionStorage.setItem("user", JSON.stringify(res.data));
        // Force an event so other components know sessionStorage updated
        window.dispatchEvent(new Event("userUpdated"));
      } catch (err) {
        console.error("Failed to sync profile:", err);
      }
    };
    fetchUser();

    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  useEffect(() => {
    const handleNotification = (event) => {
      const notification = event.detail;
      if (!notification || notificationPreferences.enabled === false) return;

      if (notificationPreferences.sound !== false) {
        playNotificationSound();
      }

      if (document.hidden) {
        document.title = notification.title || "New SafeChat activity";
      }

      if (
        notificationPreferences.desktop !== false &&
        document.hidden &&
        "Notification" in window &&
        window.Notification.permission === "granted"
      ) {
        const desktopNotification = new window.Notification(
          notification.title || "SafeChat AI",
          {
            body: notification.body || "You have new activity.",
            icon: "/favicon.svg",
            tag: notification._id,
          }
        );

        desktopNotification.onclick = () => {
          window.focus();
          if (notification.chatId?._id || notification.chatId) {
            const chatId = notification.chatId?._id || notification.chatId;
            window.location.href = `/app?chat=${chatId}`;
          } else {
            window.location.href = "/app/notifications";
          }
          desktopNotification.close();
        };
      }
    };

    window.addEventListener("safechat:notification", handleNotification);
    return () => {
      window.removeEventListener("safechat:notification", handleNotification);
    };
  }, [notificationPreferences]);

  return (
    <div className="h-screen overflow-hidden p-4 md:p-5">
      <div className="h-full flex gap-4">
        <div className="hidden md:flex shrink-0">
          <Sidebar />
        </div>

        <main className="apple-shell flex-1 min-w-0 overflow-hidden rounded-[34px]">
          <Outlet />
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
