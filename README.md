# Solo

A personal project workspace: quick capture, Today/This week/Backlog/Inbox views, editable tasks with projects, priorities, tags and notes, list and board layouts, project Markdown source notes, scratchpad, a pausable 25-minute focus timer, focus totals, and JSON backup import/export.

Run `npm start` and open http://127.0.0.1:4173. Run `npm run check` and `npm run build` to validate and prepare static files in `dist`.

Data is stored in this browser's localStorage. Each browser and site origin has a separate workspace; export backups regularly and use import to move devices. Clearing browser data removes the workspace. First launch includes example tasks. Fonts have system fallbacks. Notes are plain text/Markdown source; they are not rendered as HTML. There is no account, sync, backend, Gantt view, subtasks, or recurrence engine in this first version.

Shortcuts: N creates a task; / searches; Escape closes the task editor. Click a task title to edit or delete it. Focus sessions log 25 minutes when the timer finishes while the app is open; paused or reset sessions are not logged.

Choose **Carnival tutorial** in the header for an eight-step walkthrough of a fictional school carnival. **Add carnival example** adds one project and fourteen editable tasks without replacing current work; repeated clicks reopen the same example. It includes planning milestones, an illustrative budget, volunteer and supply tasks, event-day operations and a wrap-up. Step completion is self-reported and saved with workspace backups. Tutorial tasks use relative milestones in notes; planning buckets do not schedule dates automatically.

Reading text is enlarged throughout: task titles and notes are 17px, with supporting task labels at 14px and tutorial body text at 17px (16px on phones).

Projects appear at the top of the sidebar, including on mobile. Select a project, then use **Tasks** / **Project notes** above the content to switch sections. Notes save while typing. Left/right arrows switch tabs when the tab bar has focus. Global task views show tasks directly. The workspace summary cards and Solo sidebar label have been removed.

Select a project and choose **Edit project** beside its title to change its name and notes. **Delete project** opens a confirmation: by default its tasks are kept as Unassigned with their current planning buckets and completion status. Check **Also delete this project’s tasks** to remove them, including completed tasks. Project notes are removed on deletion; export first to retain a backup. Logged focus time is kept as Unassigned. Use the + beside Projects to create a new project in the same editor.

The **Gantt chart** tab beside Project notes shows all scheduled tasks for the selected project, sorted by start date. Set **Start date** and **End date** in the task editor; both are optional together, and the end must be on or after the start. Bars include both dates (a same-day task lasts one day). Click a bar or task label to edit. Unscheduled tasks appear below the chart with **Set dates** actions. The chart scales to the project’s range and scrolls horizontally; completed bars use a striped fill. Dates are preserved in local storage and JSON backups; older backups without dates remain supported. Date ranges are independent of the Today/This week planning buckets. Dependencies and drag-to-reschedule are not implemented.


Choose **Schedule** in Task views to plan across projects. Switch between a day and seven days. Set dates for whole-day tasks or add start/end times to schedule to the minute; timed tasks use one date. Each task has an estimated duration (30 minutes by default). The unscheduled queue offers **Find a slot**, which saves the earliest free interval on the selected date within your working hours. Completed tasks do not reserve time. Existing date-only tasks and DayFlow all-day items reserve whole days; overlaps are labeled in the agenda. Edit a task to move it or clear both dates and times to return it to the queue.

Use **Import DayFlow backup** with a JSON backup downloaded from DayFlow. This replaces only the previous calendar snapshot, preserves project tasks, and includes dated DayFlow items as read-only busy times. Undated DayFlow inbox items are omitted. Items with a start but no end reserve one hour (capped at 23:59); overnight intervals are rejected. The snapshot timestamp is shown, and it is included in workspace backups. This version does not connect to the DayFlow account or update DayFlow: reimport after calendar changes. Both apps' clock times are treated as local wall-clock times.
