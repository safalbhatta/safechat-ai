export const currentUser = {
  id: "current-user",
  name: "Alex Johnson",
  username: "@alex",
  status: "online",
  bio: "Product-focused designer and developer building modern messaging experiences.",
  location: "San Francisco, CA",
  website: "chater.app",
  joinedDate: "2024-03-12",
};

export const users = [
  {
    id: "1",
    name: "Sarah Chen",
    username: "sarah",
    status: "online",
    bio: "Frontend engineer and design systems enthusiast.",
  },
  {
    id: "2",
    name: "Marcus Lee",
    username: "marcus",
    status: "away",
    bio: "Product manager focused on collaboration tools.",
  },
  {
    id: "3",
    name: "Priya Sharma",
    username: "priya",
    status: "offline",
    bio: "UX researcher exploring better team communication.",
  },
  {
    id: "4",
    name: "Daniel Kim",
    username: "daniel",
    status: "online",
    bio: "Backend engineer working on real-time systems.",
  },
];

export const conversations = [
  {
    id: "1",
    userId: "1",
    lastMessage: "It is live right now — try it!",
    timestamp: "10:42 AM",
    unreadCount: 2,
    pinned: true,
    typing: false,
  },
  {
    id: "2",
    userId: "2",
    lastMessage: "Can you review the dashboard?",
    timestamp: "9:18 AM",
    unreadCount: 0,
    pinned: false,
    typing: true,
  },
  {
    id: "3",
    userId: "3",
    lastMessage: "Thanks, that makes sense.",
    timestamp: "Yesterday",
    unreadCount: 1,
    pinned: false,
    typing: false,
  },
  {
    id: "4",
    userId: "4",
    lastMessage: "Meeting moved to 3 PM.",
    timestamp: "Mon",
    unreadCount: 0,
    pinned: true,
    typing: false,
  },
];

export const messages = {
  "1": [
    {
      id: "m1",
      senderId: "1",
      text: "Hey! Check out this new design system 🎨",
      timestamp: "10:35 AM",
      status: "read",
    },
    {
      id: "m2",
      senderId: "current-user",
      text: "Looks amazing! When can we start using it?",
      timestamp: "10:37 AM",
      status: "read",
    },
    {
      id: "m3",
      senderId: "1",
      text: "It is live right now — try it!",
      timestamp: "10:42 AM",
      status: "delivered",
      reactions: [{ emoji: "🚀", users: ["current-user"] }],
    },
  ],
  "2": [
    {
      id: "m4",
      senderId: "2",
      text: "Can you review the dashboard?",
      timestamp: "9:18 AM",
      status: "read",
    },
  ],
  "3": [
    {
      id: "m5",
      senderId: "3",
      text: "Thanks, that makes sense.",
      timestamp: "Yesterday",
      status: "sent",
    },
  ],
  "4": [
    {
      id: "m6",
      senderId: "4",
      text: "Meeting moved to 3 PM.",
      timestamp: "Mon",
      status: "read",
    },
  ],
};

export const notifications = [
  {
    id: "n1",
    type: "message",
    user: users[0],
    content: "sent you a new message",
    timestamp: "2 min ago",
    read: false,
  },
  {
    id: "n2",
    type: "reaction",
    user: users[1],
    content: "reacted to your message",
    timestamp: "15 min ago",
    read: false,
  },
  {
    id: "n3",
    type: "contact",
    user: users[2],
    content: "sent you a contact request",
    timestamp: "1 hour ago",
    read: true,
  },
  {
    id: "n4",
    type: "mention",
    user: users[3],
    content: "mentioned you in a conversation",
    timestamp: "Yesterday",
    read: true,
  },
];

export const analyticsData = {
  totalConversations: 48,
  activeContacts: 127,
  messagesSent: 2834,
  sharedFiles: 156,
  weeklyActivity: [
    { day: "Mon", messages: 120 },
    { day: "Tue", messages: 180 },
    { day: "Wed", messages: 150 },
    { day: "Thu", messages: 230 },
    { day: "Fri", messages: 300 },
    { day: "Sat", messages: 210 },
    { day: "Sun", messages: 260 },
  ],
  monthlyGrowth: [
    { month: "Jan", conversations: 20 },
    { month: "Feb", conversations: 28 },
    { month: "Mar", conversations: 34 },
    { month: "Apr", conversations: 39 },
    { month: "May", conversations: 44 },
    { month: "Jun", conversations: 48 },
  ],
};
