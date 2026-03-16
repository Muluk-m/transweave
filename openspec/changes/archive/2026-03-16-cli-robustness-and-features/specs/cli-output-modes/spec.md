## ADDED Requirements

### Requirement: JSON output mode
All commands SHALL support a `--json` flag on the root program that outputs a single valid JSON object to stdout instead of human-readable text. Errors in JSON mode SHALL also be JSON: `{"error": "message", "code": "AUTH_ERROR"}`.

#### Scenario: Status with JSON output
- **WHEN** `transweave status --json` is run
- **THEN** stdout SHALL contain a single JSON object with language progress data
- **AND** no human-readable text SHALL be written to stdout

#### Scenario: Error in JSON mode
- **WHEN** a command fails with `--json` flag
- **THEN** stdout SHALL contain `{"error": "<message>", "code": "<error_type>"}` and the process SHALL exit with the appropriate code

### Requirement: Quiet mode
All commands SHALL support a `--quiet` flag that suppresses informational output, showing only errors and the final result.

#### Scenario: Pull in quiet mode
- **WHEN** `transweave pull --quiet` is run
- **THEN** the CLI SHALL suppress progress messages and only output errors or the final summary line

### Requirement: Formatter module
All user-facing output SHALL go through a shared formatter that respects the current output mode (normal, json, quiet). Commands SHALL NOT use `console.log` directly.

#### Scenario: Formatter in normal mode
- **WHEN** output mode is normal (no flags)
- **THEN** the formatter SHALL render human-readable tables, progress bars, and colored text
