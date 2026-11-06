# Solo

A personal project workspace: quick capture, Today/This week/Backlog/Inbox views, editable tasks with projects, priorities, tags and notes, list and board layouts, project Markdown source notes, scratchpad, a pausable 25-minute focus timer, focus totals, and JSON backup import/export.

Run `npm start` and open http://127.0.0.1:4173. Run `npm run check` and `npm run build` to validate and prepare static files in `dist`.

Data is stored in this browser's localStorage. Each browser and site origin has a separate workspace; export backups regularly and use import to move devices. Clearing browser data removes the workspace. First launch includes example tasks. Fonts have system fallbacks. Notes are plain text/Markdown source; they are not rendered as HTML. There is no account, sync, backend, Gantt view, subtasks, or recurrence engine in this first version.

Shortcuts: N creates a task; / searches; Escape closes the task editor. Click a task title to edit or delete it. Focus sessions log 25 minutes when the timer finishes while the app is open; paused or reset sessions are not logged.
