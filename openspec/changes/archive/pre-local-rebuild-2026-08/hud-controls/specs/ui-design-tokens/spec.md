## ADDED Requirements

### Requirement: Shared UI design tokens

The UI SHALL define a single set of design tokens (palette, depth/bevel, shadow, glow, press-motion timing, font) plus a haptic helper, and the in-game HUD and controls SHALL be styled from those tokens rather than ad-hoc values, so the look is consistent and reusable by other UI (e.g., the menu).

#### Scenario: HUD and controls share one look

- **WHEN** the in-game HUD and the touch controls are rendered
- **THEN** they draw their colors, depth, glow, and motion from the shared tokens (consistent visual language)

#### Scenario: Tokens are reusable

- **WHEN** another part of the UI (e.g., the menu) needs the same visual language
- **THEN** it can consume the same tokens without redefining them
