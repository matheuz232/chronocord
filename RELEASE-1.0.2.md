# ChronoCord 1.0.2

Stability release focused on desktop media and WebRTC capture.

- WebRTC camera/screen tracks use dedicated video-track replacement instead of mutating the audio stream.
- Electron display capture remains explicitly handled in the main process.
- Jukebox recognizes YouTube sources regardless of media type and surfaces media load errors.
- Watch2Chronos starts paused and only plays after user interaction.
- Direct messages safely select the first real friend and remain usable with an empty list.
- Removed legacy/fake local message seed data.
- Updater is prepared for GitHub Releases in `matheuz232/chronocord`.
