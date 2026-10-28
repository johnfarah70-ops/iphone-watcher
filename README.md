# OC Duo Scanner
Feeds oc-duo-tracker.vercel.app with Apple pickup availability every 5 seconds, using GitHub Actions.
Each run lasts ~5h40m; a new run starts automatically every 30 minutes if none is running.
Requires the repository secret `POLL_SECRET`.
