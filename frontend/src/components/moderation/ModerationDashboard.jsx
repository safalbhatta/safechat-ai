import { useEffect, useState } from "react";
import {
  X,
  Flag,
  RefreshCw,
  CheckCircle,
  EyeOff,
  Clock,
} from "lucide-react";
import API from "../../services/api";

function ModerationDashboard({ onClose }) {
  const [summary, setSummary] = useState(null);
  const [flaggedMessages, setFlaggedMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFlagData();
  }, []);

  const fetchFlagData = async () => {
    try {
      setLoading(true);

      const summaryRes = await API.get("/messages/flags/summary");
      const listRes = await API.get("/messages/flags/list");

      setSummary(summaryRes.data);
      setFlaggedMessages(listRes.data);
    } catch (error) {
      console.log("Flagged messages error:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateFlagStatus = async (messageId, flagStatus) => {
    try {
      await API.patch(`/messages/${messageId}/flag-status`, {
        flagStatus,
      });

      await fetchFlagData();
    } catch (error) {
      console.log("Update flag status error:", error);
    }
  };

  const formatDate = (date) => {
    if (!date) return "";

    return new Date(date).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="moderation-overlay">
      <div className="moderation-panel">
        <div className="moderation-header">
          <div>
            <span className="eyebrow">Message Safety</span>
            <h2>Flagged Messages</h2>
          </div>

          <div className="moderation-header-actions">
            <button className="moderation-refresh-btn" onClick={fetchFlagData}>
              <RefreshCw size={17} />
              Refresh
            </button>

            <button className="profile-close-btn" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="moderation-loading">Loading flagged messages...</div>
        ) : (
          <>
            <div className="moderation-grid">
              <div className="moderation-card total">
                <span>Total Flagged</span>
                <h3>{summary?.totalFlagged || 0}</h3>
              </div>

              <div className="moderation-card pending">
                <span>Pending</span>
                <h3>{summary?.pending || 0}</h3>
              </div>

              <div className="moderation-card normal">
                <span>Reviewed</span>
                <h3>{summary?.reviewed || 0}</h3>
              </div>

              <div className="moderation-card dismissed">
                <span>Dismissed</span>
                <h3>{summary?.dismissed || 0}</h3>
              </div>
            </div>

            <div className="flag-category-grid">
              <div>Spam <strong>{summary?.Spam || 0}</strong></div>
              <div>Harassment <strong>{summary?.Harassment || 0}</strong></div>
              <div>Hate Speech <strong>{summary?.["Hate Speech"] || 0}</strong></div>
              <div>Threat <strong>{summary?.Threat || 0}</strong></div>
              <div>Scam <strong>{summary?.Scam || 0}</strong></div>
              <div>Other <strong>{summary?.Other || 0}</strong></div>
            </div>

            <div className="flagged-section">
              <div className="flagged-section-header">
                <h3>Reported Messages</h3>
                <p>These are messages manually flagged by users.</p>
              </div>

              {flaggedMessages.length === 0 ? (
                <div className="no-flagged">
                  No flagged messages yet.
                </div>
              ) : (
                <div className="flagged-list">
                  {flaggedMessages.map((message) => (
                    <div className="flagged-item" key={message._id}>
                      <div className="flagged-icon manual">
                        <Flag size={18} />
                      </div>

                      <div className="flagged-content">
                        <div className="flagged-top">
                          <div>
                            <strong>{message.flagCategory}</strong>
                            <span className={`review-pill ${message.flagStatus?.toLowerCase()}`}>
                              {message.flagStatus}
                            </span>
                          </div>

                          <span>{formatDate(message.flaggedAt)}</span>
                        </div>

                        <p>{message.text}</p>

                        {message.flagReason && (
                          <div className="moderation-reason">
                            Reason: {message.flagReason}
                          </div>
                        )}

                        <small>
                          Sent by {message.senderId?.username || "Unknown"} ·
                          Flagged by {message.flaggedBy?.username || "Unknown"}
                        </small>

                        <div className="flagged-actions">
                          <button
                            onClick={() =>
                              updateFlagStatus(message._id, "Pending")
                            }
                          >
                            <Clock size={15} />
                            Pending
                          </button>

                          <button
                            onClick={() =>
                              updateFlagStatus(message._id, "Reviewed")
                            }
                          >
                            <CheckCircle size={15} />
                            Reviewed
                          </button>

                          <button
                            onClick={() =>
                              updateFlagStatus(message._id, "Dismissed")
                            }
                          >
                            <EyeOff size={15} />
                            Dismiss
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ModerationDashboard;