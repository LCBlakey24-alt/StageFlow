# Dated recurring session history

Stage Flow now separates a recurring timetable slot from each real session date.

A timetable item such as **Monday 10:00 Stage 2** remains reusable every week. Each actual
date gets its own occurrence record using `lessonId::YYYY-MM-DD`.

Occurrence records store:
- started / completed timestamps
- attendance
- assessment snapshot
- distance and National Curriculum snapshot
- the learner's note for that date

Assessment progress remains cumulative on the learner so achieved skills are still visible next
week. Attendance and the per-session note begin fresh for a new occurrence.

Today and Calendar completion badges read the dated occurrence instead of the timetable template,
so finishing one Monday no longer marks every future Monday as completed.

The occurrence history is part of the organisation's Supabase workspace and receives the same RLS
and optimistic revision conflict protection as the timetable and learner data.
