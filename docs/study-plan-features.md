# Study Plan Features (Weekday + Weekend)

## Goal
Help learners progress from lower bands with a weekly system that is:
- weakness-driven,
- completion-tracked,
- and includes one timed mock slot every week.

## What is implemented

### 1. Weekly Plan with Weekend Boost
- The app creates a 7-day plan for the current week (Monday to Sunday).
- Weekday and weekend are separated by `day_type`.
- Weekend (`Saturday`, `Sunday`) automatically gets more study time than weekdays:
  - `weekday_minutes = study_minutes_per_day` (from onboarding/profile)
  - `weekend_minutes = max(weekday_minutes + 20, round(weekday_minutes * 1.5))`

### 2. Auto Weakness Assignment
- Plan tasks are generated from recent weak IELTS criteria (from `writing_practice_attempts.criterion_scores`).
- Lowest-scoring criteria are converted into daily drills.
- Each generated drill keeps reference fields:
  - `weakness_key`
  - `weakness_label`
- If learner history is empty, the app uses safe fallback criteria:
  - Grammar Control
  - Lexical Resource
  - Fluency & Coherence

### 3. Plan Completion and Quality Tracking
- Every plan task has `status` (`pending` | `done`) and optional `completed_at`.
- Dashboard shows:
  - per-day completion rate,
  - completed minutes / planned minutes,
  - week completion rate.
- Completion is calculated from planned minutes (quality-oriented, not only streak count).

### 4. Weekly Timed Mock Slot
- Saturday is marked as `is_mock_day = true`.
- A dedicated `mock-test` task is auto-created on mock day.
- Mock planned duration is derived from daily target minutes:
  - `max(45, min(120, round(target_minutes * 0.65)))`
- Dashboard also shows a weekly band trend from recent attempts.

## API

### `GET /api/study-plan`
Returns the current week plan, summary, weak criteria, and weekly trend.

### `POST /api/study-plan` action: `toggle-item`
Body:
```json
{
  "action": "toggle-item",
  "itemId": "<uuid>",
  "done": true
}
```

### `POST /api/study-plan` action: `regenerate-week`
Body:
```json
{
  "action": "regenerate-week"
}
```
- Regenerates pending tasks for current week using latest weakness profile.
- Keeps already completed tasks.

## Data model

### `study_plan_days`
- one row per user/day
- unique key: `(user_id, plan_date)`
- stores `day_type`, `target_minutes`, `is_mock_day`

### `study_plan_items`
- task rows linked to `study_plan_days`
- stores `task_type`, `planned_minutes`, weakness references, and completion status

## UI
- Implemented in `Progress Dashboard`.
- Also available as a dedicated page: `/plan` (Sidebar -> Practice Tools -> Study Plan).
- Includes:
  - `Regenerate Week` action
  - daily plan cards
  - one-click task completion
  - weekend tags
  - mock-day highlight
  - weakness assignment panel
  - weekly band trend panel
