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
  const { socket } = useSocket();
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
    if (!socket) return;

    const handleReceiveMessage = async (message) => {
      try {
        const currentUser = JSON.parse(sessionStorage.getItem("user") || "null");
        if (!currentUser) return;

        const senderId = message.senderId?._id || message.senderId;
        const currentId = currentUser._id || currentUser.id;

        if (senderId === currentId) return;

        const notifSettings = JSON.parse(localStorage.getItem("notifications") || "{}");
        if (notifSettings.newMessages === false) return;

        const res = await api.get("/chats");
        const chats = res.data;
        const chat = chats.find((c) => c._id === message.chatId);

        if (chat && chat.isMuted) return;

        playNotificationSound();

        if (document.hidden) {
          document.title = "New message!";
        }
      } catch (error) {
        console.error("Failed to handle notification", error);
      }
    };

    socket.on("receiveMessage", handleReceiveMessage);

    return () => {
      socket.off("receiveMessage", handleReceiveMessage);
    };
  }, [socket]);

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
