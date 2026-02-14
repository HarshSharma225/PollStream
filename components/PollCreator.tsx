"use client";

import { useState } from "react";
import DataManager from "@/lib/data-manager";

interface PollCreatorProps {
  onComplete: (pollId: string) => void;
}

export default function PollCreator({ onComplete }: PollCreatorProps) {
  const [questionText, setQuestionText] = useState("");
  const [choices, setChoices] = useState(["", ""]);
  const [validationError, setValidationError] = useState("");

  const updateChoice = (index: number, value: string) => {
    const updated = [...choices];
    updated[index] = value;
    setChoices(updated);
  };

  const appendChoice = () => {
    if (choices.length < 8) {
      setChoices([...choices, ""]);
    }
  };

  const removeChoice = (index: number) => {
    if (choices.length > 2) {
      setChoices(choices.filter((_, i) => i !== index));
    }
  };

  const handleSubmission = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");

    const validChoices = choices.filter((c) => c.trim().length > 0);

    if (questionText.trim().length === 0) {
      setValidationError("Question is required");
      return;
    }

    if (validChoices.length < 2) {
      setValidationError("At least 2 choices are needed");
      return;
    }

    const pollId = DataManager.initializePoll(
      questionText.trim(),
      validChoices,
    );

    (async () => {
      try {
        await fetch("/api/polls", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: pollId,
            question: questionText.trim(),
            choices: validChoices,
          }),
        });
      } catch (err) {
        console.warn("Failed to persist poll to server", err);
      }
    })();

    onComplete(pollId);
  };

  return (
    <div className="creator-container">
      <h2 className="creator-title">Build Your Poll</h2>

      <form onSubmit={handleSubmission} className="creator-form">
        <div className="input-section">
          <label className="input-label">Question</label>
          <input
            type="text"
            className="text-input"
            placeholder="What would you like to ask?"
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            maxLength={180}
          />
        </div>

        <div className="input-section">
          <label className="input-label">Answer Choices</label>
          <div className="choices-container">
            {choices.map((choice, idx) => (
              <div key={idx} className="choice-row">
                <input
                  type="text"
                  className="text-input"
                  placeholder={`Choice ${idx + 1}`}
                  value={choice}
                  onChange={(e) => updateChoice(idx, e.target.value)}
                  maxLength={90}
                />
                {choices.length > 2 && (
                  <button
                    type="button"
                    className="remove-btn"
                    onClick={() => removeChoice(idx)}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          {choices.length < 8 && (
            <button
              type="button"
              className="add-choice-btn"
              onClick={appendChoice}
            >
              + Add Choice
            </button>
          )}
        </div>

        {validationError && (
          <div className="error-message">{validationError}</div>
        )}

        <button type="submit" className="submit-btn">
          Create Poll
        </button>
      </form>

      <style jsx>{`
        .creator-container {
          background: #1a1f35;
          border-radius: 16px;
          padding: 2.5rem;
          border: 1px solid #2d3548;
        }

        .creator-title {
          font-size: 1.875rem;
          font-weight: 700;
          margin-bottom: 2rem;
          color: #e0e6ff;
        }

        .creator-form {
          display: flex;
          flex-direction: column;
          gap: 1.75rem;
        }

        .input-section {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .input-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #00d9ff;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .text-input {
          width: 100%;
          padding: 0.875rem 1rem;
          background: #0f1420;
          border: 2px solid #2d3548;
          border-radius: 10px;
          color: #e0e6ff;
          font-size: 1rem;
          transition: all 0.2s;
        }

        .text-input:focus {
          outline: none;
          border-color: #00d9ff;
          box-shadow: 0 0 0 3px rgba(0, 217, 255, 0.1);
        }

        .choices-container {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .choice-row {
          display: flex;
          gap: 0.75rem;
          align-items: center;
        }

        .remove-btn {
          padding: 0.875rem;
          background: transparent;
          border: 2px solid #ff4466;
          border-radius: 10px;
          color: #ff4466;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 1.125rem;
          line-height: 1;
          min-width: 48px;
        }

        .remove-btn:hover {
          background: #ff4466;
          color: white;
        }

        .add-choice-btn {
          padding: 0.75rem 1.25rem;
          background: transparent;
          border: 2px solid #2d3548;
          border-radius: 10px;
          color: #e0e6ff;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.875rem;
          font-weight: 600;
          align-self: flex-start;
        }

        .add-choice-btn:hover {
          border-color: #00d9ff;
          color: #00d9ff;
        }

        .error-message {
          padding: 1rem;
          background: rgba(255, 68, 102, 0.1);
          border-left: 4px solid #ff4466;
          border-radius: 8px;
          color: #ff4466;
          font-size: 0.875rem;
        }

        .submit-btn {
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

        .submit-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 24px rgba(0, 217, 255, 0.4);
        }

        @media (max-width: 640px) {
          .creator-container {
            padding: 1.5rem;
          }

          .creator-title {
            font-size: 1.5rem;
          }

          .choice-row {
            flex-direction: column;
          }

          .remove-btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
