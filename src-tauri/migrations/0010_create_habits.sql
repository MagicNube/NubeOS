CREATE TABLE habits (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    normalized_name TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('habit', 'routine')),
    category TEXT NOT NULL CHECK (category IN (
        'health', 'sport', 'learning', 'personal_care',
        'home', 'organization', 'leisure', 'other'
    )),
    icon TEXT NOT NULL CHECK (icon IN (
        'check', 'book', 'languages', 'dumbbell', 'heart',
        'sparkles', 'home', 'battery', 'droplets', 'moon'
    )),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
    paused_before_archive INTEGER NOT NULL DEFAULT 0 CHECK (paused_before_archive IN (0, 1)),
    position INTEGER NOT NULL CHECK (position >= 0),
    created_on TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE habit_schedule_revisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    effective_from TEXT NOT NULL,
    schedule_type TEXT NOT NULL CHECK (schedule_type IN (
        'daily', 'specific_weekdays', 'weekly_target', 'monthly_target'
    )),
    target_count INTEGER NULL CHECK (target_count IS NULL OR target_count BETWEEN 1 AND 31),
    monthly_start_day INTEGER NULL CHECK (monthly_start_day IS NULL OR monthly_start_day BETWEEN 1 AND 28),
    UNIQUE (habit_id, effective_from)
);

CREATE TABLE habit_schedule_weekdays (
    schedule_revision_id INTEGER NOT NULL REFERENCES habit_schedule_revisions(id) ON DELETE CASCADE,
    weekday INTEGER NOT NULL CHECK (weekday BETWEEN 1 AND 7),
    position INTEGER NOT NULL CHECK (position >= 0),
    PRIMARY KEY (schedule_revision_id, weekday),
    UNIQUE (schedule_revision_id, position)
);

CREATE TABLE habit_logs (
    habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    log_date TEXT NOT NULL,
    state TEXT NOT NULL CHECK (state IN ('completed', 'skipped')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (habit_id, log_date)
);

CREATE TABLE habit_pause_intervals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    starts_on TEXT NOT NULL,
    ends_on TEXT NULL,
    CHECK (ends_on IS NULL OR ends_on >= starts_on)
);

CREATE INDEX idx_habits_status_position ON habits(status, position);
CREATE INDEX idx_habits_category ON habits(category);
CREATE INDEX idx_habits_normalized_name ON habits(normalized_name);
CREATE INDEX idx_habit_schedules_lookup ON habit_schedule_revisions(habit_id, effective_from);
CREATE INDEX idx_habit_logs_date ON habit_logs(log_date);
CREATE INDEX idx_habit_pauses_lookup ON habit_pause_intervals(habit_id, starts_on, ends_on);
