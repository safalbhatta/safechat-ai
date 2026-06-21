import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  User, Lock, Bell, Palette, Globe, Shield, Smartphone, Info, Menu, AlertTriangle, ChevronRight
} from "lucide-react";
import API from "../lib/api"; // Make sure this path is correct

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

function Card({ children }) {
  return (
    <div className="rounded-3xl bg-white/80 backdrop-blur-2xl border border-white/70 shadow-[0_18px_50px_rgba(99,102,241,0.10)] overflow-hidden">
      {children}
    </div>
  );
}

function CardHeader({ children }) {
  return <div className="px-4 sm:px-6 pt-6 pb-3">{children}</div>;
}

function CardTitle({ children, className = "" }) {
  return <h3 className={`text-xl font-black text-[#101742] ${className}`}>{children}</h3>;
}

function CardContent({ children, className = "" }) {
  return <div className={`px-4 sm:px-6 pb-6 ${className}`}>{children}</div>;
}

// UPDATED: Now accepts value, onChange, and name so it works as a controlled input
function TextInput({ label, type = "text", value, onChange, name, disabled = false }) {
  return (
    <label className="block w-full">
      <span className="block mb-2 text-sm font-bold text-[#101742]">{label}</span>
      <input
        type={type}
        name={name}
        value={value || ""}
        onChange={onChange}
        disabled={disabled}
        className={`w-full px-4 py-3 rounded-2xl chater-input border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#6366F1]/25 transition-all ${disabled ? 'bg-slate-100 text-slate-500' : 'bg-white'}`}
      />
    </label>
  );
}

// UPDATED: Now accepts onClick and disabled states
function Button({ children, variant = "primary", size = "md", className = "", onClick, disabled }) {
  const base = "inline-flex items-center justify-center rounded-2xl font-black transition-all disabled:opacity-50 disabled:cursor-not-allowed";
  const sizes = { sm: "px-4 py-2 text-sm", md: "px-5 py-3" };
  const variants = {
    primary: "text-white bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] shadow-[0_14px_34px_rgba(99,102,241,0.28)] hover:shadow-lg",
    outline: "text-[#101742] bg-white/70 border border-[#e2e8f0] hover:bg-white",
    ghost: "text-[#64748b] hover:text-[#6366F1] hover:bg-white/70",
    destructive: "text-white bg-red-500 hover:bg-red-600 shadow-[0_14px_34px_rgba(239,68,68,0.22)]",
  };

  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
}

function Toggle({ defaultChecked = true }) {
  return (
    <label className="relative inline-block w-12 h-6 shrink-0">
      <input type="checkbox" className="sr-only peer" defaultChecked={defaultChecked} />
      <div className="w-12 h-6 bg-slate-300 peer-checked:bg-[#6366F1] rounded-full peer transition-colors cursor-pointer" />
      <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-6 transition-transform" />
    </label>
  );
}

function SettingItem({ label, value, subtext, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between py-4 px-2 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors rounded-xl text-left"
    >
      <div className="flex flex-col">
        <span className="text-[15px] font-bold text-[#101742]">{label}</span>
        {subtext && <span className="text-[13px] text-[#64748b] mt-0.5">{subtext}</span>}
      </div>
      <div className="flex items-center gap-2">
        {value && <span className="text-[15px] font-semibold text-[#64748b]">{value}</span>}
        <ChevronRight size={18} className="text-[#94a3b8]" />
      </div>
    </button>
  );
}

function SelectOptionModal({ isOpen, onClose, title, options, selectedValue, onSelect }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm sm:p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-xl overflow-hidden animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 duration-300" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-[#101742]">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">✕</button>
        </div>
        <div className="p-2">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => { onSelect(opt); onClose(); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors text-left"
            >
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedValue === opt ? 'border-[#6366F1]' : 'border-slate-300'}`}>
                {selectedValue === opt && <div className="w-2.5 h-2.5 bg-[#6366F1] rounded-full" />}
              </div>
              <span className={`text-[15px] ${selectedValue === opt ? 'font-bold text-[#101742]' : 'font-medium text-[#64748b]'}`}>{opt}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("account");
  const [theme, setTheme] = useState("light");
  const [showSidebar, setShowSidebar] = useState(false);

  // --- ACCOUNT SETTINGS STATE ---
  const [accountForm, setAccountForm] = useState({ name: "", username: "", email: "", bio: "" });
  const [statusMsg, setStatusMsg] = useState({ type: "", text: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
  const [blockedCount, setBlockedCount] = useState(0);
  const [modalConfig, setModalConfig] = useState({ isOpen: false, field: null, title: "", options: [] });

  // Load user data on mount
  useEffect(() => {
    const savedUser = JSON.parse(localStorage.getItem("user") || "{}");
    setAccountForm({
      name: savedUser.name || "",
      username: savedUser.username || "",
      email: savedUser.email || "",
      bio: savedUser.bio || ""
    });
    if (savedUser.privacy) {
      setPrivacySettings({ ...defaultPrivacy, ...savedUser.privacy });
    }
    if (savedUser.blockedContacts) {
      setBlockedCount(savedUser.blockedContacts.length);
    }
  }, []);

  const handlePrivacyChange = async (field, value) => {
    const newSettings = { ...privacySettings, [field]: value };
    setPrivacySettings(newSettings);

    try {
      const res = await API.put("/users/profile", { privacy: { [field]: value } });
      localStorage.setItem("user", JSON.stringify(res.data));
    } catch (err) {
      console.error("Failed to update privacy setting", err);
    }
  };

  const openPrivacyModal = (field, title, options) => {
    setModalConfig({ isOpen: true, field, title, options });
  };

  const handleAccountChange = (e) => {
    setAccountForm({ ...accountForm, [e.target.name]: e.target.value });
    setStatusMsg({ type: "", text: "" }); // Clear errors when typing
  };

  const handleCancelAccount = () => {
    const savedUser = JSON.parse(localStorage.getItem("user") || "{}");
    setAccountForm({
      name: savedUser.name || "",
      username: savedUser.username || "",
      email: savedUser.email || "",
      bio: savedUser.bio || ""
    });
    setStatusMsg({ type: "", text: "" });
  };

  const handleSaveAccount = async () => {
    setIsSaving(true);
    setStatusMsg({ type: "", text: "" });

    try {
      // Assuming your backend uses JWT token attached in API config
      const res = await API.put("/users/profile", accountForm);

      // Update local storage with new user data
      const updatedUser = res.data;
      localStorage.setItem("user", JSON.stringify(updatedUser));

      setStatusMsg({ type: "success", text: "Profile updated successfully!" });
    } catch (err) {
      setStatusMsg({
        type: "error",
        text: err.response?.data?.message || "Failed to update profile. Username might be taken."
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await API.delete("/users/profile");
      localStorage.removeItem("user");
      // If you store token separately, remove it too: localStorage.removeItem("token");
      navigate("/login");
    } catch (err) {
      setIsDeleting(false);
      setShowDeleteModal(false);
      setStatusMsg({ type: "error", text: "Failed to delete account." });
    }
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

                {/* Status Message Display */}
                {statusMsg.text && (
                  <div className={`p-3 rounded-xl text-sm font-semibold ${statusMsg.type === 'error' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'}`}>
                    {statusMsg.text}
                  </div>
                )}

                <TextInput label="Full Name" name="name" value={accountForm.name} onChange={handleAccountChange} />
                <TextInput label="Username" name="username" value={accountForm.username} onChange={handleAccountChange} />

                {/* Usually emails are unchangeable without email verification, so we disable it */}
                <TextInput label="Email Address" name="email" value={accountForm.email} disabled={true} />
                <TextInput label="Bio" name="bio" value={accountForm.bio} onChange={handleAccountChange} />

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button onClick={handleSaveAccount} disabled={isSaving} className="w-full sm:w-auto">
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button onClick={handleCancelAccount} disabled={isSaving} variant="outline" className="w-full sm:w-auto">
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-red-500">Danger Zone</CardTitle>
              </CardHeader>

              <CardContent>
                <p className="text-[#64748b] mb-4 text-sm sm:text-base">
                  Once you delete your account, there is no going back. All your messages, contacts, and AI settings will be permanently erased.
                </p>
                <Button variant="destructive" onClick={() => setShowDeleteModal(true)} className="w-full sm:w-auto">
                  Delete Account
                </Button>
              </CardContent>
            </Card>
          </div>
        );

      // ... (Keep the rest of your cases: security, notifications, appearance, privacy exactly the same as before) ...
      case "security":
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
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="px-2 sm:px-4 pt-6">
                <div className="flex flex-col">
                  <SettingItem
                    label="Calls"
                    value={privacySettings.calls}
                    onClick={() => openPrivacyModal("calls", "Calls", ["Everyone", "Silence unknown callers"])}
                  />
                  <SettingItem
                    label="Blocked"
                    value={`${blockedCount} people`}
                    subtext="List of contacts you have blocked."
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-[#64748b]">Settings section coming soon</p>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="h-full flex bg-transparent relative overflow-hidden w-full">

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
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3 text-red-500 mb-2">
                  <AlertTriangle size={24} />
                  <CardTitle className="text-red-500">Delete Account?</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 font-medium mb-6">
                  Are you absolutely sure you want to delete your SafeChat AI account? This action is permanent and cannot be undone.
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

      {/* Mobile Dark Overlay */}
      {showSidebar && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* Sidebar with Slide Animation */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 p-4 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 h-full overflow-y-auto ${showSidebar ? "translate-x-0" : "-translate-x-full"}`}
        style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(28px)", borderRight: "1px solid rgba(226,232,240,0.6)", boxShadow: "4px 0 32px rgba(99,102,241,0.10)" }}
      >
        <div className="flex items-center justify-between mb-6 pt-2">
          <h2 className="text-xl font-black px-3 text-[#101742]">Settings</h2>
          <button onClick={() => setShowSidebar(false)} className="md:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors">✕</button>
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
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-bold ${isActive ? "text-white shadow-[0_4px_16px_rgba(99,102,241,0.35)]" : "text-[#64748b] hover:bg-white/60 hover:text-[#6366F1]"}`}
                style={isActive ? { background: "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)" } : {}}
              >
                <Icon size={20} />
                {section.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 w-full">
        <div className="md:hidden mb-6 flex items-center gap-3">
          <button onClick={() => setShowSidebar(true)} className="p-3 rounded-xl bg-white shadow-sm border border-slate-200 text-[#101742] hover:bg-slate-50 transition-colors">
            <Menu size={20} />
          </button>
          <h2 className="text-xl font-black text-[#101742] capitalize">{activeSection}</h2>
        </div>

        <div className="max-w-3xl mx-auto">{renderContent()}</div>
      </div>
    </div>
  );
}