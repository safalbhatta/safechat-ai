import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Lock,
  Bell,
  Palette,
  Globe,
  Shield,
  Smartphone,
  Info,
  ChevronRight,
  AlertTriangle,
  Menu,
  Check,
  Eye,
  EyeOff,
  Trash2,
  Key,
  ShieldCheck,
  Laptop
} from "lucide-react";
import API from "../lib/api";
import { useSocket } from "../context/SocketContext";

const settingsSections = [
  { id: "account", label: "Account", icon: User },
  { id: "security", label: "Security", icon: Lock },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "privacy", label: "Privacy", icon: Shield },
  { id: "language", label: "Language & Region", icon: Globe },
  { id: "devices", label: "Devices", icon: Smartphone },
  { id: "about", label: "About", icon: Info },
];

function Card({ children, className = "" }) {
  return (
    <div className={`rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-white/70 dark:border-slate-800 shadow-[0_18px_50px_rgba(99,102,241,0.06)] overflow-hidden transition-all duration-300 ${className}`}>
      {children}
    </div>
  );
}

function CardHeader({ children }) {
  return <div className="px-6 pt-6 pb-3">{children}</div>;
}

function CardTitle({ children, className = "" }) {
  return <h3 className={`text-xl font-black text-[#101742] dark:text-slate-100 ${className}`}>{children}</h3>;
}

function CardContent({ children, className = "" }) {
  return <div className={`px-6 pb-6 ${className}`}>{children}</div>;
}

function TextInput({ label, type = "text", value, onChange, name, disabled = false, placeholder = "" }) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <label className="block w-full">
      <span className="block mb-2 text-sm font-bold text-[#101742] dark:text-slate-200">{label}</span>
      <div className="relative">
        <input
          type={inputType}
          name={name}
          value={value || ""}
          onChange={onChange}
          disabled={disabled}
          placeholder={placeholder}
          className={`w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-[#6366F1]/25 transition-all text-[#101742] dark:text-slate-100 ${
            disabled ? 'bg-slate-100/80 dark:bg-slate-800/80 text-slate-500' : 'bg-white dark:bg-slate-950'
          }`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
    </label>
  );
}

function Button({ children, variant = "primary", size = "md", className = "", onClick, disabled }) {
  const base = "inline-flex items-center justify-center rounded-2xl font-black transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-[15px]";
  const sizes = { sm: "px-4 py-2 text-xs rounded-xl", md: "px-5 py-3" };
  const variants = {
    primary: "text-white bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] shadow-[0_14px_34px_rgba(99,102,241,0.2)] hover:shadow-lg hover:brightness-105 active:scale-98",
    outline: "text-[#101742] dark:text-slate-200 bg-white/70 dark:bg-slate-900/70 border border-[#e2e8f0] dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 active:scale-98",
    ghost: "text-[#64748b] hover:text-[#6366F1] dark:hover:text-[#8B5CF6] hover:bg-white/70 dark:hover:bg-slate-800/70 active:scale-98",
    destructive: "text-white bg-gradient-to-br from-red-500 to-rose-600 shadow-[0_14px_34px_rgba(239,68,68,0.15)] hover:shadow-lg hover:brightness-105 active:scale-98",
  };

  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="relative inline-flex w-12 h-6 shrink-0 cursor-pointer focus:outline-none items-center"
    >
      <div className={`w-12 h-6 rounded-full transition-colors duration-300 ${checked ? 'bg-[#6366F1]' : 'bg-slate-300 dark:bg-slate-800'}`} />
      <div className={`absolute w-4.5 h-4.5 bg-white rounded-full transition-transform duration-300 ${checked ? 'translate-x-6.5' : 'translate-x-1'}`} />
    </button>
  );
}

function SettingItem({ label, value, subtext, onClick }) {
  return (
    <button 
      onClick={onClick}
      className="w-full flex items-center justify-between py-4 px-2 border-b border-slate-100 dark:border-slate-800/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-950/40 transition-colors rounded-xl text-left"
    >
      <div className="flex flex-col pr-4">
        <span className="text-[15px] font-bold text-[#101742] dark:text-slate-200">{label}</span>
        {subtext && <span className="text-[13px] text-[#64748b] dark:text-slate-400 mt-0.5">{subtext}</span>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {value && <span className="text-[14px] font-semibold text-[#64748b] dark:text-slate-400">{value}</span>}
        <ChevronRight size={18} className="text-[#94a3b8]" />
      </div>
    </button>
  );
}

function SelectOptionModal({ isOpen, onClose, title, options, selectedValue, onSelect }) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm sm:p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="w-full sm:max-w-sm bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 duration-300" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-lg font-bold text-[#101742] dark:text-slate-200">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-[#101742] dark:text-slate-200 transition-colors font-bold">✕</button>
        </div>
        <div className="p-2">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => { onSelect(opt); onClose(); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
            >
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedValue === opt ? 'border-[#6366F1]' : 'border-slate-300 dark:border-slate-700'}`}>
                {selectedValue === opt && <div className="w-2.5 h-2.5 bg-[#6366F1] rounded-full" />}
              </div>
              <span className={`text-[15px] ${selectedValue === opt ? 'font-bold text-[#101742] dark:text-slate-200' : 'font-medium text-[#64748b] dark:text-slate-400'}`}>{opt}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed top-4 right-4 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border animate-in slide-in-from-top-5 duration-300 ${
      type === "success" 
        ? "bg-emerald-500 text-white border-emerald-400" 
        : "bg-red-500 text-white border-red-400"
    }`}>
      {type === "success" ? <Check size={18} className="shrink-0" /> : <AlertTriangle size={18} className="shrink-0" />}
      <span className="text-sm font-bold">{message}</span>
    </div>
  );
}

export default function Settings() {
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("account");
  const [activeSection, setActiveSection] = useState("account");
  const [showSidebar, setShowSidebar] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  // Custom Show Toast trigger
  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
  };

  // --- ACCOUNT SETTINGS STATE ---
  const [accountForm, setAccountForm] = useState({ name: "", username: "", email: "", bio: "" });
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- SECURITY SETTINGS STATE ---
  const [securityForm, setSecurityForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [enable2FA, setEnable2FA] = useState(false);
  const [activeSessions, setActiveSessions] = useState([]);

  // --- PRIVACY SETTINGS STATE ---
  const defaultPrivacy = {
    lastSeen: "Nobody",
    profilePicture: "Everyone",
    about: "My contacts",
    links: "My contacts",
    groups: "Selected contacts",
    status: "My contacts",
    calls: "Silence unknown callers"
  };
  const [privacySettings, setPrivacySettings] = useState(defaultPrivacy);
  const [modalConfig, setModalConfig] = useState({ isOpen: false, field: null, title: "", options: [] });
  const [blockedUsers, setBlockedUsers] = useState([
    { id: "b-1", name: "Spammer Dave", username: "@spamdave", bio: "Crypto promoter" },
    { id: "b-2", name: "Telemarketer Bot", username: "@telebot", bio: "Auto sales agent" }
  ]);

  // --- NOTIFICATIONS SETTINGS STATE ---
  const [notificationsSettings, setNotificationsSettings] = useState({
    newMessages: true,
    mentions: true,
    reactions: true,
    contactRequests: false
  });

  // --- APPEARANCE SETTINGS STATE ---
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");
  const [fontSize, setFontSize] = useState(() => localStorage.getItem("font-size") || "Medium");

  // --- LANGUAGE SETTINGS STATE ---
  const [language, setLanguage] = useState(() => localStorage.getItem("language") || "English");
  const [timeZone, setTimeZone] = useState(() => localStorage.getItem("timezone") || "Nepal Standard Time (GMT+5:45)");
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);

  // --- ABOUT STATE ---
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);

  // Load user data on mount
  useEffect(() => {
    const loadUser = () => {
      const savedUser = JSON.parse(sessionStorage.getItem("user") || "{}");
      setAccountForm({
        name: savedUser.name || "",
        username: savedUser.username || "",
        email: savedUser.email || "",
        bio: savedUser.bio || ""
      });
      
      if (savedUser.privacy) {
        setPrivacySettings({ ...defaultPrivacy, ...savedUser.privacy });
      }
    };
    
    loadUser();

    window.addEventListener("userUpdated", loadUser);
    return () => window.removeEventListener("userUpdated", loadUser);
  }, []);

  // Apply stored theme on load
  useEffect(() => {    
    const storedTheme = localStorage.getItem("theme") || "light";
    if (storedTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    const fetchSessions = () => {
      API.get("/users/sessions")
        .then(res => setActiveSessions(res.data))
        .catch(err => console.error("Failed to load sessions", err));
    };
    
    fetchSessions();

    if (socket) {
      socket.on("sessionCreated", fetchSessions);
      return () => {
        socket.off("sessionCreated", fetchSessions);
      };
    }
  }, [socket]);

  // Update account profile
  const handleAccountChange = (e) => {
    setAccountForm({ ...accountForm, [e.target.name]: e.target.value });
  };

  const handleCancelAccount = () => {
    const savedUser = JSON.parse(sessionStorage.getItem("user") || "{}");
    setAccountForm({
      name: savedUser.name || "",
      username: savedUser.username || "",
      email: savedUser.email || "",
      bio: savedUser.bio || ""
    });
    showToast("Changes discarded", "success");
  };

  const handleSaveAccount = async () => {
    setIsSavingAccount(true);
    try {
      const res = await API.put("/users/profile", accountForm); 
      sessionStorage.setItem("user", JSON.stringify(res.data));
      window.dispatchEvent(new Event("userUpdated"));
      showToast("Profile details updated successfully!", "success");
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || "Failed to update profile.", "error");
    } finally {
      setIsSavingAccount(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await API.delete("/users/profile");
      sessionStorage.clear();
      // Only clear session state to preserve themes, etc.
      showToast("Account deleted. Goodbye!", "success");
      setTimeout(() => navigate("/login"), 1000);
    } catch (err) {
      console.error(err);
      showToast("Failed to delete account.", "error");
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  // --- SECURITY ACTIONS ---
  const handleSecurityChange = (e) => {
    setSecurityForm({ ...securityForm, [e.target.name]: e.target.value });
  };

  const handleUpdatePassword = async () => {
    if (securityForm.newPassword !== securityForm.confirmPassword) {
      showToast("New passwords do not match.", "error");
      return;
    }
    if (securityForm.newPassword.length < 6) {
      showToast("Password must be at least 6 characters.", "error");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await API.put("/users/profile", {
        currentPassword: securityForm.currentPassword,
        newPassword: securityForm.newPassword
      });
      showToast("Password updated successfully!", "success");
      setSecurityForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || "Incorrect current password.", "error");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleRevokeSession = async (sessionId) => {
    try {
      await API.delete(`/users/sessions/${sessionId}`);
      setActiveSessions(activeSessions.filter(s => s.id !== sessionId));
      showToast("Session terminated successfully", "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to revoke session.", "error");
    }
  };

  // --- PRIVACY ACTIONS ---
  const handlePrivacyChange = async (field, value) => {
    const newSettings = { ...privacySettings, [field]: value };
    setPrivacySettings(newSettings);
    
    try {
      const res = await API.put("/users/profile", { privacy: { [field]: value } });
      sessionStorage.setItem("user", JSON.stringify(res.data));
      window.dispatchEvent(new Event("userUpdated"));
      showToast(`${field.replace(/([A-Z])/g, ' $1')} updated to ${value}`, "success");
    } catch (err) {
      console.error("Failed to update privacy setting", err);
      showToast("Failed to update privacy settings on server.", "error");
    }
  };

  const openPrivacyModal = (field, title, options) => {
    setModalConfig({ isOpen: true, field, title, options });
  };

  const handleUnblockUser = (userId, name) => {
    setBlockedUsers(blockedUsers.filter(u => u.id !== userId));
    showToast(`Unblocked ${name}`, "success");
  };

  // --- NOTIFICATION ACTIONS ---
  const handleToggleNotification = (field) => {
    const updated = { ...notificationsSettings, [field]: !notificationsSettings[field] };
    setNotificationsSettings(updated);
    localStorage.setItem("notifications", JSON.stringify(updated));
    showToast("Notification preferences updated", "success");
  };

  // --- APPEARANCE ACTIONS ---
  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    showToast(`Theme changed to ${newTheme}`, "success");
  };

  const handleFontSizeChange = (size) => {
    setFontSize(size);
    localStorage.setItem("font-size", size);
    showToast(`Font size set to ${size}`, "success");
  };

  // --- LANGUAGE ACTIONS ---
  const handleSavePreferences = () => {
    setIsSavingPrefs(true);
    setTimeout(() => {
      localStorage.setItem("language", language);
      localStorage.setItem("timezone", timeZone);
      setIsSavingPrefs(false);
      showToast("Language and timezone preferences saved!", "success");
    }, 800);
  };

  // --- ABOUT ACTIONS ---
  const handleCheckUpdates = () => {
    setIsCheckingUpdates(true);
    setTimeout(() => {
      setIsCheckingUpdates(false);
      showToast("SafeChat AI is up to date! (v1.2.0)", "success");
    }, 1200);
  };

  const renderContent = () => {
    switch (activeSection) {
      case "account":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <TextInput label="Full Name" name="name" value={accountForm.name} onChange={handleAccountChange} placeholder="e.g. Alex Johnson" />
                <TextInput label="Username" name="username" value={accountForm.username} onChange={handleAccountChange} placeholder="e.g. alex" />
                <TextInput label="Email Address" name="email" value={accountForm.email} disabled={true} />
                <TextInput label="Bio" name="bio" value={accountForm.bio} onChange={handleAccountChange} placeholder="Tell us about yourself..." />

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button onClick={handleSaveAccount} disabled={isSavingAccount} className="w-full sm:w-auto">
                    {isSavingAccount ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button onClick={handleCancelAccount} disabled={isSavingAccount} variant="outline" className="w-full sm:w-auto">
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-red-500 dark:text-red-400">Danger Zone</CardTitle>
              </CardHeader>

              <CardContent>
                <p className="text-[#64748b] dark:text-slate-400 mb-4 text-sm sm:text-base">
                  Once you delete your account, there is no going back. All your messages, contacts, and AI settings will be permanently erased.
                </p>
                <Button variant="destructive" onClick={() => setShowDeleteModal(true)} className="w-full sm:w-auto">
                  Delete Account
                </Button>
              </CardContent>
            </Card>
          </div>
        );

      case "security":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <TextInput 
                  label="Current Password" 
                  type="password" 
                  name="currentPassword" 
                  value={securityForm.currentPassword} 
                  onChange={handleSecurityChange} 
                  placeholder="Enter current password" 
                />
                <TextInput 
                  label="New Password" 
                  type="password" 
                  name="newPassword" 
                  value={securityForm.newPassword} 
                  onChange={handleSecurityChange} 
                  placeholder="At least 6 characters" 
                />
                <TextInput 
                  label="Confirm New Password" 
                  type="password" 
                  name="confirmPassword" 
                  value={securityForm.confirmPassword} 
                  onChange={handleSecurityChange} 
                  placeholder="Re-enter new password" 
                />

                <div className="pt-2">
                  <Button onClick={handleUpdatePassword} disabled={isUpdatingPassword} className="w-full sm:w-auto">
                    {isUpdatingPassword ? "Updating..." : "Update Password"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Two-Factor Authentication (2FA)</CardTitle>
              </CardHeader>

              <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="font-bold text-[#101742] dark:text-slate-200 flex items-center gap-2">
                    <Key size={18} className="text-[#6366F1]" />
                    Secure with Authenticator App
                  </p>
                  <p className="text-sm text-[#64748b] dark:text-slate-400 mt-1 max-w-md">
                    Require a verification code from your authenticator app (like Google Authenticator) whenever you sign in.
                  </p>
                </div>
                <Toggle checked={enable2FA} onChange={(val) => {
                  setEnable2FA(val);
                  showToast(val ? "2FA Setup workflow initiated!" : "2FA disabled", val ? "success" : "success");
                }} />
              </CardContent>
            </Card>
          </div>
        );

      case "notifications":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
            </CardHeader>

            <CardContent>
              <div className="space-y-4">
                {[
                  {
                    key: "newMessages",
                    label: "New messages",
                    desc: "Get notified immediately when you receive a chat message",
                  },
                  {
                    key: "mentions",
                    label: "Mentions",
                    desc: "Get notified when someone @mentions you in groups or chats",
                  },
                  {
                    key: "reactions",
                    label: "Reactions",
                    desc: "Get notified when someone reacts to your message with an emoji",
                  },
                  {
                    key: "contactRequests",
                    label: "Contact requests",
                    desc: "Get notified when someone sends you a friend or contact request",
                  },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-4 rounded-2xl bg-white/40 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 hover:border-[#6366F1]/30 transition-all duration-300"
                  >
                    <div className="flex-1">
                      <p className="font-bold text-[#101742] dark:text-slate-200">{item.label}</p>
                      <p className="text-sm text-[#64748b] dark:text-slate-400 mt-0.5">{item.desc}</p>
                    </div>
                    <div className="shrink-0 self-start sm:self-auto">
                      <Toggle 
                        checked={notificationsSettings[item.key]} 
                        onChange={() => handleToggleNotification(item.key)} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );

      case "appearance":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Appearance Settings</CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
              <div>
                <label className="block mb-3 font-bold text-[#101742] dark:text-slate-200">
                  Theme mode
                </label>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { id: "light", label: "Light theme", bg: "bg-slate-50 border-slate-200" },
                    { id: "dark", label: "Dark theme", bg: "bg-slate-950 border-slate-800 text-slate-100" }
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleThemeChange(item.id)}
                      className={`p-4 rounded-2xl border-2 transition-all text-left ${
                        theme === item.id
                          ? "border-[#6366F1] bg-slate-50 dark:bg-slate-800/40"
                          : "border-slate-200 dark:border-slate-800 hover:border-[#6366F1] hover:bg-slate-50/50"
                      }`}
                    >
                      <div className={`w-full h-20 rounded-xl mb-3 ${item.id === "light" ? "bg-white" : "bg-slate-900"} border border-slate-200/50 dark:border-slate-800 flex items-center justify-center`}>
                        <div className="text-xs font-bold text-[#6366F1]">Aa</div>
                      </div>
                      <p className="font-bold text-sm text-[#101742] dark:text-slate-200">
                        {item.label}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block mb-3 font-bold text-[#101742] dark:text-slate-200">
                  Font Size
                </label>

                <select
                  value={fontSize}
                  onChange={(e) => handleFontSizeChange(e.target.value)}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-[#101742] dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#6366F1]/25 font-bold transition-all"
                >
                  <option>Small</option>
                  <option>Medium</option>
                  <option>Large</option>
                </select>
              </div>
            </CardContent>
          </Card>
        );

      case "privacy":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Who can see my personal info</CardTitle>
              </CardHeader>

              <CardContent className="px-2 sm:px-4">
                <div className="flex flex-col">
                  <SettingItem 
                    label="Last seen & online" 
                    value={privacySettings.lastSeen} 
                    onClick={() => openPrivacyModal("lastSeen", "Last seen & online", ["Everyone", "My contacts", "Nobody"])} 
                  />
                  <SettingItem 
                    label="Profile picture" 
                    value={privacySettings.profilePicture} 
                    onClick={() => openPrivacyModal("profilePicture", "Profile picture", ["Everyone", "My contacts", "Nobody"])} 
                  />
                  <SettingItem 
                    label="About" 
                    value={privacySettings.about} 
                    onClick={() => openPrivacyModal("about", "About", ["Everyone", "My contacts", "Nobody"])} 
                  />
                  <SettingItem 
                    label="Links" 
                    value={privacySettings.links} 
                    onClick={() => openPrivacyModal("links", "Links", ["Everyone", "My contacts", "Nobody"])} 
                  />
                  <SettingItem 
                    label="Groups" 
                    value={privacySettings.groups} 
                    onClick={() => openPrivacyModal("groups", "Groups", ["Everyone", "My contacts", "Selected contacts", "Nobody"])} 
                  />
                  <SettingItem 
                    label="Status" 
                    value={privacySettings.status} 
                    onClick={() => openPrivacyModal("status", "Status", ["Everyone", "My contacts", "Selected contacts", "Nobody"])} 
                  />
                  <SettingItem 
                    label="Calls" 
                    value={privacySettings.calls} 
                    onClick={() => openPrivacyModal("calls", "Calls", ["Everyone", "Silence unknown callers"])} 
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-red-500 dark:text-red-400">Blocked Contacts</CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-sm text-[#64748b] dark:text-slate-400">
                  List of contacts you have blocked. Blocked contacts cannot see your online status or message you.
                </p>

                {blockedUsers.length === 0 ? (
                  <div className="p-6 text-center text-[#64748b] dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                    No blocked contacts
                  </div>
                ) : (
                  <div className="space-y-3">
                    {blockedUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-4 bg-white/40 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 rounded-2xl transition-all"
                      >
                        <div>
                          <p className="font-bold text-[#101742] dark:text-slate-200">{user.name}</p>
                          <p className="text-xs text-[#64748b] dark:text-slate-400">{user.username} • {user.bio}</p>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleUnblockUser(user.id, user.name)}
                        >
                          Unblock
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case "language":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Language & Region Settings</CardTitle>
            </CardHeader>

            <CardContent className="space-y-5">
              <div>
                <label className="block mb-2 text-sm font-bold text-[#101742] dark:text-slate-200">
                  Display Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-[#101742] dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#6366F1]/25 font-bold transition-all"
                >
                  <option>English</option>
                  <option>Spanish (Español)</option>
                  <option>French (Français)</option>
                  <option>German (Deutsch)</option>
                  <option>Nepali (नेपाली)</option>
                </select>
              </div>

              <div>
                <label className="block mb-2 text-sm font-bold text-[#101742] dark:text-slate-200">
                  Time Zone
                </label>
                <select
                  value={timeZone}
                  onChange={(e) => setTimeZone(e.target.value)}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-[#101742] dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#6366F1]/25 font-bold transition-all"
                >
                  <option>Nepal Standard Time (GMT+5:45)</option>
                  <option>Coordinated Universal Time (UTC)</option>
                  <option>Eastern Standard Time (EST - GMT-5)</option>
                  <option>Greenwich Mean Time (GMT)</option>
                  <option>Pacific Standard Time (PST - GMT-8)</option>
                </select>
              </div>

              <div className="pt-2">
                <Button onClick={handleSavePreferences} disabled={isSavingPrefs} className="w-full sm:w-auto">
                  {isSavingPrefs ? "Saving..." : "Save Preferences"}
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case "devices":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Manage Connected Devices</CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-sm text-[#64748b] dark:text-slate-400">
                  These devices are currently logged in to your account. You can log out of individual sessions or revoke permissions anytime.
                </p>

                <div className="space-y-3">
                  {activeSessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white/40 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 rounded-2xl transition-all gap-4"
                    >
                      <div className="flex gap-3 items-start">
                        <div className="p-3 bg-[#6366F1]/10 rounded-xl text-[#6366F1] shrink-0 mt-0.5">
                          <Laptop size={20} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-[#101742] dark:text-slate-200">{session.device}</p>
                            {session.current && (
                              <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/25">
                                Current Session
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#64748b] dark:text-slate-400 mt-1">
                            Browser: {session.browser} • IP: {session.ip}
                          </p>
                          <p className="text-xs text-[#64748b] dark:text-slate-400 mt-0.5">
                            Last Active: {new Date(session.lastActive).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {!session.current && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleRevokeSession(session.id)}
                          className="self-end sm:self-center"
                        >
                          Revoke Access
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "about":
        return (
          <Card>
            <CardHeader>
              <CardTitle>About SafeChat AI</CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="flex flex-col items-center text-center p-6 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center shadow-lg shadow-[#6366F1]/20 mb-4">
                  <ShieldCheck size={36} className="text-white" />
                </div>
                <h4 className="text-lg font-black text-[#101742] dark:text-slate-200">SafeChat AI</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Version 1.2.0 (Build 2026.06)</p>
                <p className="text-sm text-[#64748b] dark:text-slate-400 mt-3 max-w-sm">
                  Privacy-first, end-to-end secure communication powered by artificial intelligence.
                </p>

                <div className="mt-5">
                  <Button onClick={handleCheckUpdates} disabled={isCheckingUpdates}>
                    {isCheckingUpdates ? "Checking..." : "Check for Updates"}
                  </Button>
                </div>
              </div>

              <div className="space-y-3 px-2">
                <SettingItem label="Terms of Service" onClick={() => showToast("Navigating to Terms of Service...", "success")} />
                <SettingItem label="Privacy Policy" onClick={() => showToast("Navigating to Privacy Policy...", "success")} />
                <SettingItem label="Third-Party Licenses" onClick={() => showToast("Displaying open-source licenses...", "success")} />
              </div>
            </CardContent>
          </Card>
        );

      default:
        return (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-[#64748b] dark:text-slate-400">Settings section coming soon</p>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="h-full flex bg-transparent relative overflow-hidden w-full">
      {/* Toast Alert Banner */}
      {toast.show && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast({ ...toast, show: false })} 
        />
      )}

      {/* SELECT OPTION MODAL */}
      <SelectOptionModal 
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
        title={modalConfig.title}
        options={modalConfig.options}
        selectedValue={privacySettings[modalConfig.field]}
        onSelect={(val) => handlePrivacyChange(modalConfig.field, val)}
      />

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="max-w-md w-full" onClick={e => e.stopPropagation()}>
            <Card className="border-red-500/30">
              <CardHeader>
                <div className="flex items-center gap-3 text-red-500 mb-2">
                  <AlertTriangle size={24} className="shrink-0" />
                  <CardTitle className="text-red-500 dark:text-red-400">Delete Account?</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 dark:text-slate-300 font-medium mb-6 text-sm">
                  Are you absolutely sure you want to delete your SafeChat AI account? This action is permanent and cannot be undone. You will lose all your message history.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button variant="destructive" onClick={handleDeleteAccount} disabled={isDeleting} className="w-full">
                    {isDeleting ? "Deleting..." : "Yes, Delete Everything"}
                  </Button>
                  <Button variant="outline" onClick={() => setShowDeleteModal(false)} disabled={isDeleting} className="w-full">
                    No, Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Mobile Sidebar Overlay */}
      {showSidebar && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 p-4 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 h-full overflow-y-auto bg-white/80 dark:bg-slate-900/90 border-r border-slate-200/60 dark:border-slate-800/80 shadow-[4px_0_32px_rgba(99,102,241,0.05)] ${showSidebar ? "translate-x-0" : "-translate-x-full"}`}
        style={{ 
          backdropFilter: "blur(28px)", 
        }}
      >
        <div className="flex items-center justify-between mb-6 pt-2">
          <h2 className="text-xl font-black px-3 text-[#101742] dark:text-slate-100">Settings</h2>
          <button onClick={() => setShowSidebar(false)} className="md:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-300 transition-colors">✕</button>
        </div>

        <nav className="space-y-1">
          {settingsSections.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => {
                  setActiveSection(section.id);
                  if (window.innerWidth < 768) setShowSidebar(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-bold ${
                  isActive 
                    ? "text-white shadow-[0_4px_16px_rgba(99,102,241,0.25)]" 
                    : "text-[#64748b] dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800/60 hover:text-[#6366F1]"
                }`}
                style={isActive ? { background: "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)" } : {}}
              >
                <Icon size={20} />
                {section.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Content Pane */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 w-full bg-slate-50/50 dark:bg-slate-950/20">
        <div className="md:hidden mb-6 flex items-center gap-3">
          <button onClick={() => setShowSidebar(true)} className="p-3 rounded-xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 text-[#101742] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors">
            <Menu size={20} />
          </button>
          <h2 className="text-xl font-black text-[#101742] dark:text-slate-100 capitalize">{activeSection}</h2>
        </div>

        <div className="max-w-3xl mx-auto">{renderContent()}</div>
      </div>
    </div>
  );
}