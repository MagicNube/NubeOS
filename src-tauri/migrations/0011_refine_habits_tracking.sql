ALTER TABLE habits ADD COLUMN starts_on TEXT NOT NULL DEFAULT '1970-01-01';
ALTER TABLE habits ADD COLUMN icon_key TEXT NOT NULL DEFAULT 'check';

UPDATE habits
SET starts_on = created_on,
    icon_key = icon;

CREATE TABLE habit_schedule_month_days (
    schedule_revision_id INTEGER NOT NULL REFERENCES habit_schedule_revisions(id) ON DELETE CASCADE,
    month_day INTEGER NOT NULL CHECK (month_day BETWEEN 1 AND 28),
    position INTEGER NOT NULL CHECK (position >= 0),
    PRIMARY KEY (schedule_revision_id, month_day),
    UNIQUE (schedule_revision_id, position)
);

INSERT INTO habit_schedule_month_days (schedule_revision_id, month_day, position)
SELECT id, monthly_start_day, 0
FROM habit_schedule_revisions
WHERE schedule_type = 'monthly_target'
  AND monthly_start_day IS NOT NULL;

CREATE INDEX idx_habit_month_days_revision
ON habit_schedule_month_days(schedule_revision_id, position);
