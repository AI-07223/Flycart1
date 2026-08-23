## ADDED Requirements

### Requirement: Maintained source and test artifacts stay reviewable
Repository-maintained source and test files SHALL remain in readable multi-line form after cleanup work, rather than being checked in as machine-like single-line output.

#### Scenario: Reboot-touched tests remain readable
- **WHEN** a contributor opens a maintained test file touched by the cleanup
- **THEN** the file is formatted in a reviewable multi-line structure instead of a flattened single line

### Requirement: Checked-in browser JavaScript is regenerated from source
When cleanup changes affect maintained client-side source or browser runtime packaging, the committed `public/js/*.js` artifacts SHALL be regenerated from the maintained source files before the change is considered complete.

#### Scenario: Generated browser output matches maintained sources
- **WHEN** cleanup changes are finished
- **THEN** the checked-in browser JavaScript has been rebuilt from `src/client/` rather than edited independently
