import { useState } from "react";
import {
  User,
  Lock,
  Bell,
  Palette,
  Globe,
  Shield,
  Smartphone,
  Info,
} from "lucide-react";
import { currentUser as fallbackUser } from "../data/mockData.js";

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
  return <div className="px-6 pt-6 pb-3">{children}</div>;
}

function CardTitle({ children }) {
  return <h3 className="text-xl font-black text-[#101742]">{children}</h3>;
}

function CardContent({ children, className = "" }) {
  return <div className={`px-6 pb-6 ${className}`}>{children}</div>;
}

function TextInput({ label, type = "text", defaultValue = "" }) {
  return (
    <label className="block">
      <span className="block mb-2 text-sm font-bold text-[#101742]">
        {label}
      </span>
      <input
        type={type}
        defaultValue={defaultValue}
        className="w-full px-4 py-3 rounded-2xl chater-input focus:outline-none focus:ring-2 focus:ring-[#6366F1]/25 transition-all"
      />
    </label>
  );
}

function Button({ children, variant = "primary", size = "md" }) {
  const base =
    "inline-flex items-center justify-center rounded-2xl font-black transition-all";

  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-5 py-3",
  };

  const variants = {
    primary:
      "text-white bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] shadow-[0_14px_34px_rgba(99,102,241,0.28)]",
    outline:
      "text-[#101742] bg-white/70 border border-[#e2e8f0] hover:bg-white",
    ghost:
      "text-[#64748b] hover:text-[#6366F1] hover:bg-white/70",
    destructive:
      "text-white bg-red-500 hover:bg-red-600 shadow-[0_14px_34px_rgba(239,68,68,0.22)]",
  };

  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]}`}>
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

export default function Settings() {
  const savedUser = JSON.parse(localStorage.getItem("user") || "null");

  const currentUser = savedUser
    ? {
        ...fallbackUser,
        ...savedUser,
        username: savedUser.username?.startsWith("@")
          ? savedUser.username
          : `@${savedUser.username}`,
      }
    : fallbackUser;

  const [activeSection, setActiveSection] = useState("account");
  const [theme, setTheme] = useState("light");
  const [showSidebar, setShowSidebar] = useState(false);

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
                <TextInput label="Full Name" defaultValue={currentUser.name} />
                <TextInput label="Username" defaultValue={currentUser.username} />
                <TextInput
                  label="Email"
                  type="email"
                  defaultValue="alex@example.com"
                />
                <TextInput label="Bio" defaultValue={currentUser.bio} />

                <div className="flex gap-3 pt-2">
                  <Button>Save Changes</Button>
                  <Button variant="outline">Cancel</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Delete Account</CardTitle>
              </CardHeader>

              <CardContent>
                <p className="text-[#64748b] mb-4">
                  Once you delete your account, there is no going back. Please be certain.
                </p>
                <Button variant="destructive">Delete Account</Button>
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
                <TextInput label="Current Password" type="password" />
                <TextInput label="New Password" type="password" />
                <TextInput label="Confirm New Password" type="password" />
                <Button>Update Password</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Two-Factor Authentication</CardTitle>
              </CardHeader>

              <CardContent>
                <p className="text-[#64748b] mb-4">
                  Add an extra layer of security to your account.
                </p>
                <Button>Enable 2FA</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Active Sessions</CardTitle>
              </CardHeader>

              <CardContent>
                <div className="space-y-3">
                  {[
                    "MacBook Pro - San Francisco",
                    "iPhone 15 - San Francisco",
                    "iPad Air - San Francisco",
                  ].map((device, index) => (
                    <div
                      key={device}
                      className="flex items-center justify-between p-4 rounded-xl"
                      style={{
                        background: "rgba(255,255,255,0.60)",
                        border: "1px solid rgba(255,255,255,0.84)",
                      }}
                    >
                      <div>
                        <p className="font-bold text-[#101742]">{device}</p>
                        <p className="text-sm text-[#64748b]">
                          Last active: {index === 0 ? "Now" : `${index} hours ago`}
                        </p>
                      </div>

                      {index !== 0 && <Button variant="ghost" size="sm">Revoke</Button>}
                    </div>
                  ))}
                </div>
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
                    label: "New messages",
                    desc: "Get notified when you receive a new message",
                  },
                  {
                    label: "Mentions",
                    desc: "Get notified when someone mentions you",
                  },
                  {
                    label: "Reactions",
                    desc: "Get notified when someone reacts to your message",
                  },
                  {
                    label: "Contact requests",
                    desc: "Get notified when someone sends you a contact request",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between gap-4 p-4 rounded-xl hover:bg-white/40"
                    style={{
                      background: "rgba(255,255,255,0.60)",
                      border: "1px solid rgba(255,255,255,0.84)",
                    }}
                  >
                    <div>
                      <p className="font-bold text-[#101742]">{item.label}</p>
                      <p className="text-sm text-[#64748b]">{item.desc}</p>
                    </div>
                    <Toggle />
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

            <CardContent>
              <div className="space-y-6">
                <div>
                  <label className="block mb-3 font-bold text-[#101742]">
                    Theme
                  </label>

                  <div className="grid grid-cols-2 gap-4">
                    {["light", "dark"].map((item) => (
                      <button
                        key={item}
                        onClick={() => setTheme(item)}
                        className={`p-6 rounded-xl border-2 transition-all ${
                          theme === item
                            ? "border-[#6366F1] bg-[#EEF2FF]"
                            : "border-[#e2e8f0] hover:border-[#6366F1]"
                        }`}
                      >
                        <div
                          className={`w-full h-24 rounded-lg mb-3 ${
                            item === "light" ? "bg-white" : "bg-zinc-900"
                          }`}
                        />
                        <p className="font-bold capitalize text-[#101742]">
                          {item}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block mb-3 font-bold text-[#101742]">
                    Font Size
                  </label>

                  <select
                    defaultValue="Medium"
                    className="w-full px-4 py-3 bg-white/70 border border-[#e2e8f0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6366F1]/25"
                  >
                    <option>Small</option>
                    <option>Medium</option>
                    <option>Large</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case "privacy":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Privacy Settings</CardTitle>
            </CardHeader>

            <CardContent>
              <div className="space-y-4">
                {[
                  {
                    label: "Show online status",
                    desc: "Let others see when you are online",
                  },
                  {
                    label: "Read receipts",
                    desc: "Let others know when you have read their messages",
                  },
                  {
                    label: "Profile visibility",
                    desc: "Allow others to view your profile",
                  },
                  {
                    label: "Contact sync",
                    desc: "Find contacts from your address book",
                  },
                ].map((item, index) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between gap-4 p-4 bg-[#eef4ff] rounded-xl"
                  >
                    <div>
                      <p className="font-bold text-[#101742]">{item.label}</p>
                      <p className="text-sm text-[#64748b]">{item.desc}</p>
                    </div>
                    <Toggle defaultChecked={index < 2} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
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
    <div className="h-full flex bg-transparent">
      <div
        className={`
          ${showSidebar ? "block" : "hidden md:block"}
          w-64 p-4 absolute md:relative z-10 h-full md:h-auto
        `}
        style={{
          background: "rgba(255,255,255,0.78)",
          backdropFilter: "blur(28px)",
          WebkitBackdropFilter: "blur(28px)",
          borderRight: "1px solid rgba(226,232,240,0.6)",
          boxShadow: "4px 0 32px rgba(99,102,241,0.10)",
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black px-3 text-[#101742]">Settings</h2>

          <button
            onClick={() => setShowSidebar(false)}
            className="md:hidden p-2 hover:bg-white/60 rounded-lg"
          >
            ✕
          </button>
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
                  setShowSidebar(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-bold ${
                  isActive
                    ? "text-white shadow-[0_4px_16px_rgba(99,102,241,0.35)]"
                    : "text-[#64748b] hover:bg-white/60 hover:text-[#6366F1]"
                }`}
                style={
                  isActive
                    ? {
                        background:
                          "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)",
                      }
                    : {}
                }
              >
                <Icon size={20} />
                {section.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <button
          onClick={() => setShowSidebar(true)}
          className="md:hidden mb-4 px-4 py-2 rounded-xl font-bold"
          style={{
            background: "rgba(255,255,255,0.80)",
            border: "1px solid rgba(226,232,240,0.8)",
          }}
        >
          Settings Menu
        </button>

        <div className="max-w-3xl">{renderContent()}</div>
      </div>
    </div>
  );
}


