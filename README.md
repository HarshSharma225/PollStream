# PollStream

A modern real-time polling platform built with Next.js 14, TypeScript, and browser storage.

## Features

- Create polls with custom questions and multiple options
- Share polls via unique URLs
- Real-time vote updates across all viewers
- Vote fraud prevention using dual verification
- Persistent data storage
- Responsive design for all devices

## Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: CSS-in-JS (styled-jsx)
- **Storage**: Browser localStorage
- **Real-time**: Storage events + periodic polling

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
```

### Production

```bash
npm start
```

## Project Structure

```
pollstream-nextjs/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Main page
│   └── globals.css         # Global styles
├── components/
│   ├── HomePage.tsx        # Main application logic
│   ├── PollCreator.tsx     # Poll creation interface
│   └── PollDisplay.tsx     # Poll voting interface
├── lib/
│   └── data-manager.ts     # Data persistence layer
└── public/                 # Static assets
```

## Anti-Fraud Mechanisms

### Session Tracking

Prevents multiple votes from the same browser session using sessionStorage-based identifiers.

**Implementation**:

- Unique session ID generated on first visit
- Stored in sessionStorage (cleared on tab close)
- Checked before accepting votes

**Prevents**:

- Accidental duplicate voting
- Multiple rapid votes from same session

**Limitations**:

- Bypassed by opening new private/incognito window
- Cleared when browser tab is closed

### Device Fingerprinting

Creates a signature from browser and device characteristics to identify repeat voters.

**Components Used**:

- User agent string
- Browser language
- Screen resolution and color depth
- Timezone offset
- Hardware concurrency
- Device memory

**Prevents**:

- Voting via incognito mode after already voting
- Basic automated voting attempts

**Limitations**:

- Can be bypassed with different browsers
- Basic implementation (privacy-focused)
- Not 100% unique across all devices

### Rate Limiting

Monitors voting activity over time windows to prevent rapid automated voting.

**Implementation**:

- Tracks timestamps of all votes
- Checks vote count in 60-second sliding window
- Blocks if threshold exceeded

**Prevents**:

- Automated rapid voting scripts
- DoS-style voting attacks

## Edge Cases Handled

1. **Input Validation**
   - Empty questions and options
   - Minimum 2 options required
   - Character limits enforced
   - Whitespace trimming

2. **Storage Management**
   - Try-catch blocks for all storage operations
   - Graceful degradation if storage unavailable
   - Data corruption recovery

3. **Navigation**
   - Invalid poll IDs
   - Missing URL parameters
   - Browser history management

4. **Voting**
   - Already voted detection
   - Concurrent vote handling
   - Invalid option selection

5. **Display**
   - Zero votes state
   - Long text overflow
   - Responsive layouts

## Known Limitations

### Storage

- No automatic cleanup of old polls
- Browser-specific (doesn't sync across devices)

### Security

- Client-side validation only
- localStorage can be manually edited
- No server-side verification
- No IP tracking (requires backend)

### Real-time

- 1.5-second polling interval (not instant)
- Storage events only work in same browser
- Doesn't sync across different networks

### Scalability

- Single-file architecture
- No code splitting
- All data in browser memory

## Future Enhancements

- Backend API for true persistence
- WebSocket for real-time updates
- User authentication
- Poll analytics
- Result exports
- Multiple choice voting
- Poll expiration
- Admin dashboard