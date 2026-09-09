# manthaino UI Design System

## Brand

Display brand: **manthaino**

Product phrase: **LEARN on ur phase**

Technical identifier: `manthaino`

## Personality

The interface should feel:

- intelligent
- calm
- technical
- premium
- academic
- trustworthy
- progress-oriented

Not:

- childish
- gaming-heavy
- cyberpunk
- generic chatbot
- overdecorated AI

## Design language

Use:
- warm neutral/off-white backgrounds
- near-black/deep navy typography
- restrained blue/lavender accent
- thin 1px borders
- medium-radius cards
- subtle shadows
- generous whitespace
- strong typographic hierarchy
- compact technical data visualizations

Use design tokens instead of hardcoding colors throughout components.

Tokens:

```text
background
surface
surface-muted
foreground
foreground-muted
border
primary
primary-soft
success
warning
danger
```

## Typography

Primary:
- Inter or Geist

Technical:
- JetBrains Mono or Geist Mono

## Navigation

```text
manthaino

Home
My Path
Assessments
Projects
Progress
Ask
```

## Path node states

```text
✓ Completed
● Current
🔓 Unlocked
🔒 Locked
```

Every locked node must show its reason.

## Learning workspace

Desktop:

```text
Left sidebar:
- path
- current node
- progress

Main:
- lesson/context
- AI tutor
- exercises

Optional right panel:
- mastery
- current concept
- resources
- next action
```

The pathway should remain visible during learning.

## Chat behavior

Chat should:
- stream responses;
- preserve history;
- show contextual actions;
- support code blocks;
- support citations/resources when applicable;
- distinguish tutor messages from system/progress events.

## Assessment UI

Show:
- skill being assessed;
- difficulty;
- progress;
- question;
- answer;
- feedback;
- final result.

Do not reveal the correct answer before submission.

## Progress UI

Always distinguish:

```text
Learning Progress
vs
Verified Mastery
vs
Confidence
```

Example:

```text
Python
Learning progress: 100%
Verified mastery: 84%
Confidence: 92%
```

## Lock UI

Example:

```text
🔒 Distributed Systems

Locked because:
• Data Modeling is incomplete
• Required proficiency: 70%
• Current proficiency: 43%

Complete Data Modeling to unlock this node.
```

## Empty states

Always explain the next action.

Example:

> No verified skills yet. Start your diagnostic assessment to build your baseline.

## Error states

Never expose raw exceptions.

Example:

> We couldn't load your learning state. Your progress is safe. Try again.

## Motion

Allowed:
- node unlock
- progress changes
- chat streaming
- subtle hover/focus
- page transitions

Avoid:
- constant floating elements
- excessive particle effects
- distracting animations

## Accessibility

Required:
- keyboard navigation
- visible focus
- semantic controls
- form labels
- sufficient contrast
- reduced-motion support

## Responsive behavior

Desktop:
- persistent path sidebar + learning workspace

Tablet:
- collapsible path sidebar

Mobile:
- path drawer
- full-width chat
- compact progress header
