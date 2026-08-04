#!/bin/zsh
# Daily runner for the Report Portal failed-tests matrix.
#
# What it does:
#   1. cd into the repo
#   2. Pull latest master (stashing any local changes to be safe)
#   3. npm install (in case deps changed)
#   4. Run the matrix script for all launches x teams
#   5. Run the log analyzer and save a timestamped report
#
# Designed to be invoked by launchd (see com.folio.runFailedTestsMatrix.plist).
# Also runnable manually:  ./scripts/report-portal/dailyMatrix.sh

set -u

# --- Config (override via environment if needed) -----------------------------
REPO_DIR="${REPO_DIR:-/Users/vadymshchekotilin/IdeaProjects/epm/stripes-testing}"
BRANCH="${BRANCH:-master}"
TEAMS="${TEAMS:-Firebird,Corsair}"
CONCURRENCY="${CONCURRENCY:-4}"
REPORTS_DIR="${REPORTS_DIR:-$REPO_DIR/logs/reports}"
# Epic under which one Jira task per flaky test case is created/updated after a run.
# The description of each task is enriched with Report Portal pass/flaky/fail
# statistics. Requires JIRA_API_KEY in the environment / .env.
JIRA_EPIC="${JIRA_EPIC:-UXPROD-5976}"

# --- Load nvm so the correct node/npm are on PATH (launchd has a minimal env) -
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
# Ensure git (Homebrew) is reachable too
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

TIMESTAMP="$(date +%Y-%m-%d_%H-%M-%S)"
mkdir -p "$REPORTS_DIR"
RUN_LOG="$REPORTS_DIR/run-$TIMESTAMP.log"

# Everything below is tee'd into the run log
{
  echo "=========================================================="
  echo " Daily matrix run: $TIMESTAMP"
  echo " Repo: $REPO_DIR   Branch: $BRANCH   Teams: $TEAMS   Concurrency: $CONCURRENCY"
  echo "=========================================================="

  cd "$REPO_DIR" || { echo "✗ Cannot cd into $REPO_DIR"; exit 1; }

  echo "\n▶ Updating $BRANCH ..."
  git fetch origin "$BRANCH" || { echo "✗ git fetch failed"; exit 1; }
  # Stash local changes (if any) so pull never fails; keep them for you afterwards
  if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "  Local changes detected → stashing"
    git stash push -u -m "dailyMatrix-autostash-$TIMESTAMP" || true
  fi
  git checkout "$BRANCH" || { echo "✗ git checkout $BRANCH failed"; exit 1; }
  git reset --hard "origin/$BRANCH" || { echo "✗ git reset failed"; exit 1; }
  echo "  Now at commit: $(git rev-parse --short HEAD)"

  echo "\n▶ Installing dependencies (npm ci if lockfile present, else npm install) ..."
  if [ -f package-lock.json ]; then
    npm ci || npm install || { echo "✗ npm install failed"; exit 1; }
  else
    npm install || { echo "✗ npm install failed"; exit 1; }
  fi

  echo "\n▶ Running matrix ..."
  EPIC_ARGS=()
  if [ -n "$JIRA_EPIC" ]; then
    echo "  Will create/update flaky-test tasks under epic: $JIRA_EPIC"
    EPIC_ARGS=(--epic "$JIRA_EPIC")
  else
    echo "  ⚠ JIRA_EPIC is empty → flaky-test tasks will NOT be created/updated."
    echo "    Set JIRA_EPIC (and JIRA_API_KEY) to sync flaky tickets after the run."
  fi
  node scripts/report-portal/runFailedTestsMatrix.js --teams "$TEAMS" --concurrency "$CONCURRENCY" "${EPIC_ARGS[@]}"
  MATRIX_EXIT=$?
  echo "  Matrix exit code: $MATRIX_EXIT"

  echo "\n▶ Collecting statistics from logs ..."
  node scripts/report-portal/analyzeLogs.js --failures | tee "$REPORTS_DIR/summary-$TIMESTAMP.txt"

  echo "\n✔ Done: $TIMESTAMP"
  echo "  Run log:  $RUN_LOG"
  echo "  Summary:  $REPORTS_DIR/summary-$TIMESTAMP.txt"
} 2>&1 | tee "$RUN_LOG"

