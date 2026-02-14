"use client";

import { useState, useEffect, useCallback } from "react";
import DataManager, { Poll } from "@/lib/data-manager";

interface PollDisplayProps {
  pollId: string;
}

export default function PollDisplay({ pollId }: PollDisplayProps) {
  const [pollData, setPollData] = useState<Poll | null>(null);
  const [participated, setParticipated] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [notification, setNotification] = useState<{
    type: string;
    text: string;
  } | null>(null);

  const refreshPollData = useCallback(async () => {
    try {
      const res = await fetch(`/api/polls/${pollId}`);
      if (res.ok) {
        const json = await res.json();
        if (json && json.poll) {
          const data = DataManager.loadAllData();
          data.polls = data.polls || {};
          data.votes = data.votes || {};
          data.polls[pollId] = json.poll;
          data.votes[pollId] =
            data.votes[pollId] ||
            json.votes || {
              sessionVotes: {},
              deviceVotes: {},
              recentActivity: [],
            };
          DataManager.persistData(data);
          setPollData(json.poll);
          setParticipated(DataManager.checkParticipation(pollId));
          setSelectedOption(DataManager.getParticipantChoice(pollId));
          return;
        }
      }
    } catch (err) {
      // fallback to local
    }

    const data = DataManager.retrievePoll(pollId);
    if (data) {
      setPollData(data);
      setParticipated(DataManager.checkParticipation(pollId));
      setSelectedOption(DataManager.getParticipantChoice(pollId));
    }
  }, [pollId]);

  useEffect(() => {
    refreshPollData();

    const handleUpdate = () => refreshPollData();
    window.addEventListener("dataUpdate", handleUpdate);

    const refreshTimer = setInterval(refreshPollData, 1500);

    return () => {
      window.removeEventListener("dataUpdate", handleUpdate);
      clearInterval(refreshTimer);
    };
  }, [refreshPollData]);

  const submitVote = async (optionId: number) => {
    if (participated) {
      setNotification({ type: "warning", text: "Already participated" });
      setTimeout(() => setNotification(null), 4000);
      return;
    }

    const result = await DataManager.recordVote(pollId, optionId);

    if (result.success) {
      setNotification({ type: "success", text: "Vote counted" });
      setParticipated(true);
      setSelectedOption(optionId);
      refreshPollData();
    } else {
      setNotification({ type: "error", text: result.message });
    }

    setTimeout(() => setNotification(null), 4000);
  };

  const copyShareLink = () => {
    const url = `${window.location.origin}/?poll=${pollId}`;
    navigator.clipboard.writeText(url);
    setNotification({ type: "success", text: "Link copied" });
    setTimeout(() => setNotification(null), 3000);
  };

  if (!pollData) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading poll data...</p>
        <style jsx>{`
          .loading-container {
            text-align: center;
            padding: 4rem 2rem;
            color: #8b92b0;
          }

          .spinner {
            width: 48px;
            height: 48px;
            margin: 0 auto 1.5rem;
            border: 4px solid #2d3548;
            border-top-color: #00d9ff;
            border-radius: 50%;
            animation: rotate 1s linear infinite;
          }

          @keyframes rotate {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  const shareLink = `${typeof window !== "undefined" ? window.location.origin : ""}/?poll=${pollId}`;

  return (
    <div className="poll-container">
      <div className="poll-header">
        <h2 className="poll-question">{pollData.question}</h2>
        <span className="live-indicator">
          <span className="pulse-dot"></span>
          Active
        </span>
      </div>

      {notification && (
        <div className={`notification notification-${notification.type}`}>
          {notification.text}
        </div>
      )}

      <div className="options-list">
        {pollData.options.map((option) => {
          const percentage =
            pollData.totalVotes > 0
              ? Math.round((option.count / pollData.totalVotes) * 100)
              : 0;

          const isSelected = selectedOption === option.id;

          return (
            <div
              key={option.id}
              className={`option-card ${participated ? "voted" : ""}`}
              onClick={() => !participated && submitVote(option.id)}
            >
              <div
                className="progress-bar"
                style={{ width: `${percentage}%` }}
              ></div>
              <div className="option-content">
                <span className="option-text">
                  {isSelected && "✓ "}
                  {option.text}
                </span>
                <div className="option-stats">
                  <span className="percentage">{percentage}%</span>
                  <span className="vote-count">
                    {option.count} {option.count === 1 ? "vote" : "votes"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="poll-footer">
        <div className="meta-stats">
          <span>Total: {pollData.totalVotes}</span>
          <span>
            Created: {new Date(pollData.timestamp).toLocaleDateString()}
          </span>
        </div>
      </div>

      <div className="share-section">
        <label className="share-label">Share Link</label>
        <div className="share-box">
          <input
            type="text"
            value={shareLink}
            readOnly
            className="share-input"
          />
          <button onClick={copyShareLink} className="copy-btn">
            Copy
          </button>
        </div>
      </div>

      <style jsx>{`
        .poll-container {
          background: #1a1f35;
          border-radius: 16px;
          padding: 2.5rem;
          border: 1px solid #2d3548;
        }

        .poll-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2rem;
          gap: 1rem;
        }

        .poll-question {
          font-size: 1.75rem;
          font-weight: 700;
          color: #e0e6ff;
          line-height: 1.3;
          margin: 0;
        }

        .live-indicator {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: rgba(0, 217, 255, 0.15);
          border: 1px solid #00d9ff;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 700;
          color: #00d9ff;
          white-space: nowrap;
        }

        .pulse-dot {
          width: 8px;
          height: 8px;
          background: #00d9ff;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
            box-shadow: 0 0 0 0 rgba(0, 217, 255, 0.7);
          }
          50% {
            opacity: 0.6;
            box-shadow: 0 0 0 8px rgba(0, 217, 255, 0);
          }
        }

        .notification {
          padding: 1rem 1.25rem;
          border-radius: 10px;
          margin-bottom: 1.5rem;
          font-size: 0.875rem;
          border-left: 4px solid;
        }

        .notification-success {
          background: rgba(0, 217, 255, 0.1);
          border-color: #00d9ff;
          color: #00d9ff;
        }

        .notification-warning {
          background: rgba(255, 170, 0, 0.1);
          border-color: #ffaa00;
          color: #ffaa00;
        }

        .notification-error {
          background: rgba(255, 68, 102, 0.1);
          border-color: #ff4466;
          color: #ff4466;
        }

        .options-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .option-card {
          position: relative;
          background: #0f1420;
          border: 2px solid #2d3548;
          border-radius: 12px;
          padding: 1.25rem 1.5rem;
          cursor: pointer;
          transition: all 0.25s;
          overflow: hidden;
        }

        .option-card:not(.voted):hover {
          border-color: #00d9ff;
          transform: translateX(4px);
        }

        .option-card.voted {
          cursor: default;
          border-color: #00d9ff;
        }

        .progress-bar {
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          background: linear-gradient(
            90deg,
            rgba(0, 217, 255, 0.2),
            rgba(0, 153, 255, 0.2)
          );
          transition: width 0.5s ease;
          border-radius: 10px;
        }

        .option-content {
          position: relative;
          display: flex;
          justify-content: space-between;
          align-items: center;
          z-index: 1;
          gap: 1rem;
        }

        .option-text {
          font-weight: 600;
          color: #e0e6ff;
          font-size: 1rem;
        }

        .option-stats {
          display: flex;
          gap: 1rem;
          align-items: center;
          font-size: 0.875rem;
        }

        .percentage {
          color: #00d9ff;
          font-weight: 700;
          min-width: 50px;
          text-align: right;
        }

        .vote-count {
          color: #8b92b0;
        }

        .poll-footer {
          padding-top: 1.5rem;
          border-top: 1px solid #2d3548;
          margin-bottom: 2rem;
        }

        .meta-stats {
          display: flex;
          gap: 2rem;
          color: #8b92b0;
          font-size: 0.875rem;
        }

        .share-section {
          background: #0f1420;
          border: 2px solid #00d9ff;
          border-radius: 12px;
          padding: 1.5rem;
        }

        .share-label {
          display: block;
          font-size: 0.875rem;
          font-weight: 600;
          color: #00d9ff;
          margin-bottom: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .share-box {
          display: flex;
          gap: 0.75rem;
        }

        .share-input {
          flex: 1;
          padding: 0.75rem 1rem;
          background: #1a1f35;
          border: 1px solid #2d3548;
          border-radius: 8px;
          color: #00d9ff;
          font-size: 0.875rem;
          font-family: monospace;
        }

        .copy-btn {
          padding: 0.75rem 1.5rem;
          background: transparent;
          border: 2px solid #2d3548;
          border-radius: 8px;
          color: #e0e6ff;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .copy-btn:hover {
          border-color: #00d9ff;
          color: #00d9ff;
        }

        @media (max-width: 640px) {
          .poll-container {
            padding: 1.5rem;
          }

          .poll-header {
            flex-direction: column;
          }

          .poll-question {
            font-size: 1.5rem;
          }

          .option-content {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
          }

          .meta-stats {
            flex-direction: column;
            gap: 0.5rem;
          }

          .share-box {
            flex-direction: column;
          }

          .copy-btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
