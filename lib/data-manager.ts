interface PollOption {
  id: number;
  text: string;
  count: number;
}

interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  timestamp: number;
  totalVotes: number;
}

interface VoteRecord {
  sessionVotes: Record<string, { optionId: number; time: number }>;
  deviceVotes: Record<string, { optionId: number; time: number }>;
  recentActivity: number[];
}

class DataManager {
  private static STORE_KEY = "polls_data";
  private static SESSION_KEY = "user_session";

  static createIdentifier(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 15);
    return `${timestamp}-${random}`;
  }

  static getSessionIdentifier(): string {
    if (typeof window === "undefined") return "";

    let sessionId = sessionStorage.getItem(this.SESSION_KEY);
    if (!sessionId) {
      sessionId = this.createIdentifier();
      sessionStorage.setItem(this.SESSION_KEY, sessionId);
    }
    return sessionId;
  }

  static createDeviceSignature(): string {
    if (typeof window === "undefined") return "";

    const hardwareConcurrency =
      (navigator as any).hardwareConcurrency?.toString() || "0";
    const deviceMemory = (navigator as any).deviceMemory?.toString() || "0";

    const features = [
      navigator.userAgent,
      navigator.language,
      screen.colorDepth.toString(),
      `${screen.width}x${screen.height}`,
      new Date().getTimezoneOffset().toString(),
      hardwareConcurrency,
      deviceMemory,
    ];

    return btoa(features.join("::"));
  }

  static loadAllData(): {
    polls: Record<string, Poll>;
    votes: Record<string, VoteRecord>;
  } {
    if (typeof window === "undefined") {
      return { polls: {}, votes: {} };
    }

    try {
      const stored = localStorage.getItem(this.STORE_KEY);
      if (!stored) return { polls: {}, votes: {} };
      return JSON.parse(stored);
    } catch (error) {
      console.error("Storage read error:", error);
      return { polls: {}, votes: {} };
    }
  }

  static persistData(data: {
    polls: Record<string, Poll>;
    votes: Record<string, VoteRecord>;
  }): void {
    if (typeof window === "undefined") return;

    try {
      localStorage.setItem(this.STORE_KEY, JSON.stringify(data));
      window.dispatchEvent(new CustomEvent("dataUpdate", { detail: data }));
    } catch (error) {
      console.error("Storage write error:", error);
    }
  }

  static initializePoll(question: string, choices: string[]): string {
    const data = this.loadAllData();
    const pollId = this.createIdentifier();

    data.polls[pollId] = {
      id: pollId,
      question,
      options: choices.map((text, idx) => ({
        id: idx,
        text,
        count: 0,
      })),
      timestamp: Date.now(),
      totalVotes: 0,
    };

    data.votes[pollId] = {
      sessionVotes: {},
      deviceVotes: {},
      recentActivity: [],
    };

    this.persistData(data);
    return pollId;
  }

  static retrievePoll(pollId: string): Poll | null {
    const data = this.loadAllData();
    return data.polls[pollId] || null;
  }

  static validateVoteEligibility(pollId: string): {
    eligible: boolean;
    reason?: string;
  } {
    const data = this.loadAllData();
    const sessionId = this.getSessionIdentifier();
    const deviceSig = this.createDeviceSignature();

    const voteRecord = data.votes[pollId];
    if (!voteRecord) {
      return { eligible: false, reason: "Poll data not found" };
    }

    if (voteRecord.sessionVotes[sessionId]) {
      return {
        eligible: false,
        reason: "Session already participated",
      };
    }

    if (voteRecord.deviceVotes[deviceSig]) {
      return {
        eligible: false,
        reason: "Poll already recorded",
      };
    }

    const currentTime = Date.now();
    const timeWindow = 60000;
    const activityInWindow = voteRecord.recentActivity.filter(
      (time) => currentTime - time < timeWindow,
    );

    if (activityInWindow.length > 8) {
      return {
        eligible: false,
        reason: "Max Activity exceeded",
      };
    }

    return { eligible: true };
  }

  static async recordVote(
    pollId: string,
    optionId: number,
  ): Promise<{ success: boolean; message: string }> {
    const eligibility = this.validateVoteEligibility(pollId);
    if (!eligibility.eligible) {
      return { success: false, message: eligibility.reason || "Vote rejected" };
    }

    const sessionId = this.getSessionIdentifier();
    const deviceSig = this.createDeviceSignature();
    const timestamp = Date.now();

    const data = this.loadAllData();
    const poll = data.polls[pollId];
    if (!poll) {
      return { success: false, message: "Poll not found" };
    }

    const option = poll.options.find((opt) => opt.id === optionId);
    if (!option) {
      return { success: false, message: "Invalid option selected" };
    }

    option.count = (option.count || 0) + 1;
    poll.totalVotes = (poll.totalVotes || 0) + 1;

    data.votes = data.votes || {};
    data.votes[pollId] = data.votes[pollId] || {
      sessionVotes: {},
      deviceVotes: {},
      recentActivity: [],
    };
    data.votes[pollId].sessionVotes[sessionId] = { optionId, time: timestamp };
    data.votes[pollId].deviceVotes[deviceSig] = { optionId, time: timestamp };
    data.votes[pollId].recentActivity.push(timestamp);
    if (data.votes[pollId].recentActivity.length > 50)
      data.votes[pollId].recentActivity =
        data.votes[pollId].recentActivity.slice(-30);

    this.persistData(data);

    try {
      const res = await fetch(`/api/polls/${pollId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          optionId,
          sessionId,
          deviceSig,
          time: timestamp,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json && json.poll) {
          const serverData = this.loadAllData();
          serverData.polls = serverData.polls || {};
          serverData.votes = serverData.votes || {};
          serverData.polls[pollId] = json.poll;
          serverData.votes[pollId] =
            json.votes || serverData.votes[pollId] || serverData.votes[pollId];
          this.persistData(serverData);
          return { success: true, message: "Vote recorded" };
        }
      }

      const revertData = this.loadAllData();
      const revertPoll = revertData.polls[pollId];
      if (revertPoll) {
        const revertOption = revertPoll.options.find(
          (o: any) => o.id === optionId,
        );
        if (revertOption && revertOption.count > 0) revertOption.count--;
        if (revertPoll.totalVotes > 0) revertPoll.totalVotes--;
        this.persistData(revertData);
      }

      return { success: false, message: "Failed to record vote on server" };
    } catch (err) {
      console.warn("Failed to sync vote to server", err);

      const revertData = this.loadAllData();
      const revertPoll = revertData.polls[pollId];
      if (revertPoll) {
        const revertOption = revertPoll.options.find(
          (o: any) => o.id === optionId,
        );
        if (revertOption && revertOption.count > 0) revertOption.count--;
        if (revertPoll.totalVotes > 0) revertPoll.totalVotes--;
        this.persistData(revertData);
      }

      return { success: false, message: "Network error" };
    }
  }

  static checkParticipation(pollId: string): boolean {
    const data = this.loadAllData();
    const sessionId = this.getSessionIdentifier();
    const voteRecord = data.votes[pollId];

    if (!voteRecord) return false;
    return !!voteRecord.sessionVotes[sessionId];
  }

  static getParticipantChoice(pollId: string): number | null {
    const data = this.loadAllData();
    const sessionId = this.getSessionIdentifier();
    const voteRecord = data.votes[pollId];

    if (!voteRecord || !voteRecord.sessionVotes[sessionId]) {
      return null;
    }
    return voteRecord.sessionVotes[sessionId].optionId;
  }
}

export default DataManager;
export type { Poll, PollOption, VoteRecord };
