"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import PollCreator from "@/components/PollCreator";
import PollDisplay from "@/components/PollDisplay";
import DataManager from "@/lib/data-manager";

export default function HomePage() {
  const searchParams = useSearchParams();
  const [activeView, setActiveView] = useState<"create" | "poll" | "notfound">(
    "create",
  );
  const [currentPollId, setCurrentPollId] = useState<string | null>(null);

  useEffect(() => {
    const pollParam = searchParams.get("poll");

    if (pollParam) {
      const exists = DataManager.retrievePoll(pollParam);
      if (exists) {
        setCurrentPollId(pollParam);
        setActiveView("poll");
      } else {
        (async () => {
          try {
            const res = await fetch(`/api/polls/${pollParam}`);
            if (res.ok) {
              const json = await res.json();
              if (json && json.poll) {
                const poll = json.poll;
                const data = DataManager.loadAllData();
                data.polls = data.polls || {};
                data.votes = data.votes || {};
                data.polls[pollParam] = poll;
                data.votes[pollParam] = data.votes[pollParam] || {
                  sessionVotes: {},
                  deviceVotes: {},
                  recentActivity: [],
                };
                DataManager.persistData(data);
                setCurrentPollId(pollParam);
                setActiveView("poll");
                return;
              }
            }
          } catch (err) {
            console.warn("Server fetch failed", err);
          }

          setActiveView("notfound");
        })();
      }
    } else {
      setActiveView("create");
    }
  }, [searchParams]);

  const handlePollCreated = (pollId: string) => {
    setCurrentPollId(pollId);
    setActiveView("poll");
    window.history.pushState({}, "", `/?poll=${pollId}`);
  };

  const navigateHome = () => {
    setActiveView("create");
    setCurrentPollId(null);
    window.history.pushState({}, "", "/");
  };

  return (
    <div className="page-wrapper">
      <header className="site-header">
        <h1 className="site-title">PollStream</h1>
        <p className="site-tagline">Real-Time Poll</p>
      </header>

      <main className="main-content">
        {activeView === "create" && (
          <PollCreator onComplete={handlePollCreated} />
        )}

        {activeView === "poll" && currentPollId && (
          <>
            <PollDisplay pollId={currentPollId} />
            <button onClick={navigateHome} className="new-poll-btn">
              Create Another Poll
            </button>
          </>
        )}

        {activeView === "notfound" && (
          <div className="error-container">
            <div className="error-box">
              <h2>Poll Not Found</h2>
              <p>This poll doesn't exist or has been removed.</p>
              <button onClick={navigateHome} className="home-btn">
                Return Home
              </button>
            </div>
          </div>
        )}
      </main>

      <style jsx>{`
        .page-wrapper {
          min-height: 100vh;
          background: #0f1420;
          background-image:
            radial-gradient(
              circle at 15% 15%,
              rgba(0, 217, 255, 0.08) 0%,
              transparent 45%
            ),
            radial-gradient(
              circle at 85% 85%,
              rgba(0, 153, 255, 0.08) 0%,
              transparent 45%
            );
        }

        .site-header {
          background: #1a1f35;
          border-bottom: 2px solid #00d9ff;
          padding: 1.5rem 2rem;
          box-shadow: 0 4px 20px rgba(0, 217, 255, 0.15);
        }

        .site-title {
          font-size: 2rem;
          font-weight: 800;
          background: linear-gradient(135deg, #00d9ff, #0099ff);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0;
        }

        .site-tagline {
          color: #8b92b0;
          font-size: 0.875rem;
          margin: 0.25rem 0 0 0;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .main-content {
          max-width: 800px;
          margin: 0 auto;
          padding: 3rem 2rem;
        }

        .new-poll-btn {
          width: 100%;
          margin-top: 1.5rem;
          padding: 1rem 2rem;
          background: transparent;
          border: 2px solid #2d3548;
          border-radius: 10px;
          color: #e0e6ff;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .new-poll-btn:hover {
          border-color: #00d9ff;
          color: #00d9ff;
        }

        .error-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 400px;
        }

        .error-box {
          background: #1a1f35;
          border: 1px solid #2d3548;
          border-radius: 16px;
          padding: 3rem 2rem;
          text-align: center;
          max-width: 500px;
        }

        .error-box h2 {
          font-size: 1.875rem;
          color: #e0e6ff;
          margin: 0 0 1rem 0;
        }

        .error-box p {
          color: #8b92b0;
          margin: 0 0 2rem 0;
          line-height: 1.6;
        }

        .home-btn {
          padding: 1rem 2rem;
          background: linear-gradient(135deg, #00d9ff, #0099ff);
          border: none;
          border-radius: 10px;
          color: #0f1420;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 4px 16px rgba(0, 217, 255, 0.3);
        }

        .home-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 24px rgba(0, 217, 255, 0.4);
        }

        @media (max-width: 640px) {
          .main-content {
            padding: 2rem 1rem;
          }

          .site-title {
            font-size: 1.5rem;
          }

          .error-box {
            padding: 2rem 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}
