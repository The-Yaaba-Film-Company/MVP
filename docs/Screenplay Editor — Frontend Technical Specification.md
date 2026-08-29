# Screenplay Editor — Frontend Technical Specification

**Version:** 1.0  
**Status:** Product / Technical Specification  
**Scope:** Frontend only  
**Primary Editor:** Tiptap / ProseMirror  
**Primary Goal:** Build a professional screenplay editor capable of structured screenplay authoring, scene management, semantic element tracking, production-element tagging, and screenplay pagination.

---

# 1. Purpose

The Screenplay Editor is a structured screenplay-authoring environment for creating and managing film/television scripts.

Unlike a conventional rich-text editor, the editor must understand the semantic structure of a screenplay.

The system must distinguish between:

- Scene Headings
- Action
- Character
- Dialogue
- Parenthetical
- Transition
- Shot
- General/Other screenplay elements

The editor must also support the identification and tracking of:

- Characters
- Locations
- Props
- Vehicles
- Set Dressing
- Wardrobe
- Sound
- VFX
- SFX
- Makeup/Hair
- Stunts
- Extras
- Other production elements

The screenplay itself is the primary source document.

Production information is derived from the screenplay and its annotations.

---

# 2. Core Architectural Principle

The system MUST NOT treat the screenplay as an HTML document or collection of formatted paragraphs.

The screenplay is a structured document.

```text
Project
└── Screenplay
    ├── Scene
    │   ├── Scene Heading
    │   ├── Action
    │   ├── Character
    │   ├── Parenthetical
    │   ├── Dialogue
    │   ├── Action
    │   └── Transition
    │
    ├── Scene
    └── Scene
```

Tiptap/ProseMirror is responsible for editing this structured document.

A separate semantic layer maintains relationships between screenplay content and project entities.

A separate pagination/layout layer determines physical screenplay pages.

---

# 3. High-Level Architecture

```text
                         USER
                           │
                           ▼
                ┌────────────────────┐
                │   Tiptap Editor     │
                │   ProseMirror       │
                └─────────┬──────────┘
                          │
                    Editor Events
                          │
                          ▼
                ┌────────────────────┐
                │ Screenplay Domain  │
                │      Model         │
                └─────────┬──────────┘
                          │
             ┌────────────┼────────────┐
             ▼            ▼            ▼
      Semantic Engine  Pagination   Validation
             │          Engine
             ▼
       Project Indexes
             │
     ┌───────┼────────┐
     ▼       ▼        ▼
 Characters Locations Elements
```

---

# 4. Technology Requirements

## 4.1 Editor

Use:

- Tiptap
- ProseMirror
- TypeScript

Recommended Tiptap capabilities:

- Custom nodes
- Custom extensions
- Commands
- Keyboard shortcuts
- Input rules
- Node views where appropriate
- Decorations
- Transactions
- Document traversal
- Plugin state

---

# 5. Document Schema

The ProseMirror document should have a root structure similar to:

```text
Document
│
├── Scene
│   ├── SceneHeading
│   ├── Action
│   ├── Character
│   ├── Parenthetical
│   ├── Dialogue
│   ├── Action
│   └── Transition
│
├── Scene
│   └── ...
│
└── Scene
```

The editor must prevent arbitrary document structures that violate screenplay semantics where possible.

---

# 6. Screenplay Nodes

## 6.1 Scene Node

### Purpose

Represents a complete screenplay scene.

### Attributes

```typescript
interface SceneAttributes {
  id: string
  number?: string
  locked: boolean
}
```

### Example

```text
Scene
 ├── SceneHeading
 ├── Action
 ├── Character
 ├── Dialogue
 └── Transition
```

### Responsibilities

The Scene node:

- Defines a scene boundary
- Provides a unique scene ID
- Contains screenplay elements
- Is indexed by the semantic engine
- Is associated with characters
- Is associated with production elements
- Is associated with a location
- Has derived page information

---

# 7. Scene Heading Node

## Purpose

Represents:

```text
INT. HOUSE - NIGHT
EXT. STREET - DAY
INT./EXT. CAR - DAY
```

### Attributes

```typescript
interface SceneHeadingAttributes {
  intExt: 'INT' | 'EXT' | 'INT/EXT' | 'I/E'
  location: string
  timeOfDay: string
}
```

Optional:

```typescript
modifier?: string
```

### Example internal representation

```json
{
  "type": "sceneHeading",
  "attrs": {
    "intExt": "INT",
    "location": "POLICE STATION",
    "timeOfDay": "NIGHT"
  }
}
```

### Display

```text
INT. POLICE STATION - NIGHT
```

### Behavior

When creating a new scene heading, the editor should support:

- INT
- EXT
- INT/EXT
- I/E

Location and time of day should be independently represented.

---

# 8. Action Node

## Purpose

Represents screenplay action/description.

Example:

```text
John enters the room carrying a backpack.

He looks around.

The phone rings.
```

### Attributes

```typescript
interface ActionAttributes {
  id: string
}
```

Action content may contain semantic annotations.

Example:

```typescript
interface ActionAnnotation {
  id: string
  start: number
  end: number
  entityId: string
  entityType: ProductionElementType
}
```

---

# 9. Character Node

## Purpose

Represents a speaker.

Example:

```text
JOHN
```

### Attributes

```typescript
interface CharacterNodeAttributes {
  characterId: string
  displayName: string
  extension?: string
}
```

The `characterId` should reference the project's canonical character entity.

Example:

```json
{
  "type": "character",
  "attrs": {
    "characterId": "character_123",
    "displayName": "JOHN"
  }
}
```

---

# 10. Dialogue Node

## Purpose

Represents dialogue belonging to the preceding Character node.

Example:

```text
I don't know where she went.
```

### Attributes

```typescript
interface DialogueAttributes {
  id: string
}
```

The dialogue does not need to independently store the character ID if its parent/preceding Character node establishes the relationship.

However, the semantic index should resolve:

```text
Dialogue
   ↓
Speaker
   ↓
Character Entity
```

---

# 11. Parenthetical Node

## Purpose

Represents parenthetical dialogue direction.

Example:

```text
JOHN

(quietly)

I don't know.
```

### Attributes

```typescript
interface ParentheticalAttributes {
  id: string
}
```

Parentheticals should only be valid within a dialogue block.

---

# 12. Transition Node

## Purpose

Represents transitions such as:

```text
CUT TO:
FADE OUT.
DISSOLVE TO:
SMASH CUT TO:
```

### Attributes

```typescript
interface TransitionAttributes {
  transitionType?: string
}
```

Transition nodes should be right-aligned according to screenplay formatting conventions.

---

# 13. Shot Node

Optional but recommended.

Examples:

```text
CLOSE ON JOHN.

WIDE SHOT - THE STREET.

ANGLE ON THE PHONE.
```

This should be a semantic node rather than simply Action if the product intends to support production breakdowns.

```typescript
interface ShotAttributes {
  id: string
  shotType?: string
}
```

---

# 14. General Element Node

The editor should support a generic screenplay element for cases that do not fit the standard elements.

```typescript
interface GeneralElementAttributes {
  id: string
}
```

This prevents the editor from becoming unnecessarily restrictive.

---

# 15. Production Element Model

Production elements are NOT screenplay nodes.

They are project entities referenced by screenplay annotations.

```typescript
type ProductionElementType =
  | 'character'
  | 'prop'
  | 'vehicle'
  | 'set_dressing'
  | 'wardrobe'
  | 'sound'
  | 'vfx'
  | 'sfx'
  | 'makeup'
  | 'hair'
  | 'stunt'
  | 'animal'
  | 'extra'
  | 'equipment'
  | 'other'
```

Example:

```typescript
interface ProductionElement {
  id: string
  name: string
  type: ProductionElementType
}
```

---

# 16. Annotation System

Production tagging should use annotations rather than modifying screenplay text.

Example screenplay:

```text
John grabs the pistol from the desk.
```

Semantic annotation:

```json
[
  {
    "start": 15,
    "end": 21,
    "entityId": "prop-pistol",
    "entityType": "prop"
  },
  {
    "start": 31,
    "end": 35,
    "entityId": "set-desk",
    "entityType": "set_dressing"
  }
]
```

This allows the same screenplay to produce multiple views.

### Writer View

```text
John grabs the pistol from the desk.
```

### Breakdown View

```text
John grabs [PISTOL] from the [DESK].
```

### Prop Report

```text
PISTOL
Scenes: 4, 8, 17
```

The underlying screenplay text remains unchanged.

---

# 17. Character Tracking

The semantic engine must maintain a project-wide character index.

Example:

```typescript
interface Character {
  id: string
  name: string
  aliases?: string[]
}
```

The system must track:

```text
Character
 ├── Scenes appearing in
 ├── Dialogue occurrences
 ├── Number of appearances
 └── Production notes
```

Example:

```text
JOHN
Scenes:
1
2
5
8
13
17
```

---

# 18. Scene Character Index

Every scene should expose the characters present.

Example:

```typescript
interface SceneIndex {
  sceneId: string
  characters: string[]
}
```

Example:

```text
Scene 17

Characters:
- JOHN
- MARY
- DETECTIVE
```

This must be derived from screenplay content.

The scene should not require the user to manually maintain this list.

---

# 19. Location Tracking

Locations should be normalized.

Example:

```text
INT. POLICE STATION - DAY
INT. POLICE STATION - NIGHT
```

Both should resolve to:

```text
POLICE STATION
```

while preserving:

```text
INT/EXT
DAY/NIGHT
```

This allows reports such as:

```text
POLICE STATION

Scenes:
12
18
24
27
```

---

# 20. Location Entity

```typescript
interface Location {
  id: string
  name: string
}
```

Scene heading:

```typescript
interface SceneLocation {
  locationId: string
  intExt: string
  timeOfDay: string
}
```

---

# 21. Editor Keyboard Shortcuts

The editor should provide fast screenplay-element switching.

Recommended:

```text
Ctrl/Cmd + 1 → Scene Heading
Ctrl/Cmd + 2 → Action
Ctrl/Cmd + 3 → Character
Ctrl/Cmd + 4 → Dialogue
Ctrl/Cmd + 5 → Parenthetical
Ctrl/Cmd + 6 → Transition
Ctrl/Cmd + 7 → Shot
Ctrl/Cmd + 8 → General
```

These should be configurable.

---

# 22. Contextual Enter Behavior

The Enter key should intelligently create the next screenplay element.

Recommended defaults:

```text
Scene Heading
       ↓ Enter
Action

Action
       ↓ Enter
Action

Character
       ↓ Enter
Dialogue

Dialogue
       ↓ Enter
Action

Parenthetical
       ↓ Enter
Dialogue

Transition
       ↓ Enter
Scene Heading / Action
```

The user must be able to override the automatically selected element.

---

# 23. Tab-Based Element Switching

Optional but strongly recommended.

When editing an element:

```text
Tab
```

can cycle through compatible screenplay elements.

Example:

```text
Action
 ↓ Tab
Character
 ↓ Tab
Dialogue
 ↓ Tab
Parenthetical
```

Shift+Tab should cycle backwards.

---

# 24. Slash Command

Implement a Tiptap-style slash command.

Typing:

```text
/
```

opens:

```text
Screenplay Element

Scene Heading
Action
Character
Dialogue
Parenthetical
Transition
Shot
General
```

Search should filter the menu.

Example:

```text
/character
```

selects Character.

---

# 25. Automatic Character Recognition

When the user creates a Character node:

```text
JOHN
```

the system should:

1. Normalize the name.
2. Search the character index.
3. Reuse an existing character if matched.
4. Otherwise offer/create a new character entity.
5. Associate subsequent dialogue with that character.

The system should avoid creating duplicate characters:

```text
JOHN
John
JOHN DOE
```

without user confirmation or normalization rules.

---

# 26. Character Autocomplete

When typing a Character node:

```text
JO...
```

the editor should offer:

```text
JOHN
JOAN
JOSEPH
```

Selecting a character should associate the node with its canonical character ID.

---

# 27. Production Element Tagging UI

The user should be able to select text and choose:

```text
Tag Element
```

Menu:

```text
Character
Prop
Vehicle
Set Dressing
Wardrobe
Sound
VFX
SFX
Makeup
Hair
Stunt
Animal
Extra
Equipment
Other
```

Example:

```text
John picks up the pistol.
              └── Prop
```

The selection should receive an annotation.

---

# 28. Tagging Shortcut

Recommended:

```text
Ctrl/Cmd + Shift + T
```

opens the production-element tagging menu.

Optional:

```text
Ctrl/Cmd + Shift + 1 → Character
Ctrl/Cmd + Shift + 2 → Prop
Ctrl/Cmd + Shift + 3 → Vehicle
...
```

These shortcuts should remain configurable.

---

# 29. Scene Creation

The editor must support creating scenes from:

- New Scene button
- Enter after a completed scene
- Scene menu
- Keyboard shortcut

Recommended:

```text
Ctrl/Cmd + Shift + N
```

Create Scene.

Creating a scene should generate:

```text
Scene
 └── Scene Heading
```

with the cursor positioned in the heading.

---

# 30. Scene Navigator

The left-hand navigation panel should display:

```text
SCENES

01  INT. HOUSE - DAY
02  EXT. STREET - NIGHT
03  INT. POLICE STATION - DAY
04  EXT. ROOFTOP - NIGHT
```

Each scene should show optional metadata:

```text
01  INT. HOUSE - DAY
    John, Mary
```

Clicking a scene should scroll the editor to that scene.

---

# 31. Scene Reordering

Scenes should be reorderable.

Recommended:

- Drag and drop
- Move up
- Move down
- Move to scene
- Duplicate scene

Reordering must preserve scene IDs.

Scene IDs must NOT be based on scene number.

---

# 32. Scene Numbering

Scene IDs and scene numbers must be different.

```text
id: scene_92837
number: 12
```

Before script lock:

```text
1
2
3
4
```

After script lock, insertion may produce:

```text
1
2
2A
3
4
```

The implementation should support locked scene numbering as a future feature even if the initial release does not expose it.

---

# 33. Page Layout

The screenplay must render using traditional screenplay conventions.

Target:

```text
Paper:
US Letter — 8.5 × 11 inches

Font:
Courier 12pt

Left margin:
1.5 inches

Right margin:
1 inch

Top margin:
1 inch

Bottom margin:
approximately 1 inch
```

However, element-specific horizontal positions must be supported.

The system must NOT assume every element uses the same left margin.

---

# 34. Element Layout Geometry

The layout engine must maintain geometry definitions.

Conceptually:

```typescript
interface ElementLayout {
  left: number
  right: number
  topSpacing: number
  bottomSpacing: number
  alignment: 'left' | 'center' | 'right'
}
```

Example:

```text
Action
Character
Dialogue
Parenthetical
Transition
```

each have different widths and positioning.

---

# 35. Pagination Engine

Pagination MUST be separated from the editor's semantic model.

Input:

```text
Screenplay Document
```

Output:

```typescript
interface Page {
  pageNumber: number
  blocks: PageBlock[]
}
```

Where:

```typescript
interface PageBlock {
  nodeId: string
  startOffset?: number
  endOffset?: number
}
```

---

# 36. Page Calculation

The pagination engine must consider:

- Font
- Font size
- Line height
- Page size
- Margins
- Element width
- Element spacing
- Text wrapping
- Scene headings
- Dialogue blocks
- Parentheticals
- Transitions
- Page breaks
- Continuation rules

It must not calculate pages solely by character count.

---

# 37. Runtime Estimate

The system should provide:

```text
Estimated Runtime: 47 minutes
```

based on screenplay page count.

The calculation should be treated as an estimate.

Default:

```text
1 screenplay page ≈ 1 minute
```

The system should expose:

```typescript
estimatedRuntime = pageCount * runtimePerPage
```

where `runtimePerPage` can eventually be configurable.

---

# 38. Scene Page Metrics

Each scene should expose derived metrics:

```typescript
interface SceneMetrics {
  sceneId: string
  startPage: number
  endPage: number
  pageLength: number
}
```

Example:

```text
Scene 12

Pages: 17–18
Length: 1.4 pages
```

These values are derived and should not be treated as primary screenplay data.

---

# 39. Page Break Handling

The pagination engine must support:

- Natural page breaks
- Explicit user page breaks
- Scene-aware page breaks
- Dialogue continuation
- Element continuation

The system should avoid splitting elements in invalid ways.

For example, a Character node should not be stranded at the bottom of a page without its dialogue.

---

# 40. Dialogue Continuation

When dialogue exceeds a page, the pagination engine should support continuation formatting.

Example:

```text
JOHN

This is a long speech...
```

continued on the next page using screenplay continuation conventions.

The continuation behavior should be generated by the layout engine rather than permanently inserted into the screenplay text.

---

# 41. Semantic Engine

The semantic engine maintains indexes derived from the document.

Responsibilities:

```text
Scene indexing
Character indexing
Location indexing
Production element indexing
Dialogue/speaker relationships
Scene/entity relationships
Document validation
```

---

# 42. Incremental Updates

The semantic engine should NOT reprocess the entire screenplay after every keystroke.

Use ProseMirror transactions to determine what changed.

Example:

```text
Transaction
    ↓
Changed document range
    ↓
Affected Scene
    ↓
Reindex affected scene
```

For a large screenplay this is critical.

---

# 43. Semantic Index

Recommended structure:

```typescript
interface ScreenplayIndex {
  scenes: Map<string, SceneIndex>
  characters: Map<string, CharacterIndex>
  locations: Map<string, LocationIndex>
  productionElements: Map<string, ProductionElementIndex>
}
```

Example:

```typescript
interface CharacterIndex {
  characterId: string
  sceneIds: string[]
  dialogueCount: number
}
```

---

# 44. Derived Project Data

The system should be capable of generating:

### Characters

```text
JOHN
Scenes: 1, 3, 5, 9
Dialogue: 37 lines
```

### Locations

```text
POLICE STATION
Scenes: 4, 8, 12
```

### Props

```text
PISTOL
Scenes: 8, 12, 18
```

### Vehicles

```text
BMW
Scenes: 2, 9
```

---

# 45. Editor Views

The initial frontend should support at least:

## Writer View

Traditional screenplay.

## Scene View

Focus on individual scene.

## Breakdown View

Production elements highlighted.

## Navigator View

Scene list and metadata.

Future:

- Character view
- Location view
- Production report
- Schedule view
- Stripboard view

---

# 46. Breakdown Highlighting

Tagged elements should be visually distinguishable in Breakdown View.

Example:

```text
John enters the police station carrying a pistol.
^^^^                 ^^^^^^^^^^^^^         ^^^^^^
Character            Location              Prop
```

The visual treatment should be implemented using Tiptap/ProseMirror decorations or marks where appropriate.

The underlying text must remain unchanged.

---

# 47. Search

Search must support:

### Text

```text
pistol
```

### Characters

```text
John
```

### Scenes

```text
Scene 12
```

### Locations

```text
Police Station
```

### Production elements

```text
Pistol
```

Search results should be able to navigate directly to the corresponding document position.

---

# 48. Replace

Standard text replacement should be supported.

However, replacing a canonical entity name should optionally provide:

```text
Replace text
```

versus:

```text
Rename character globally
```

Example:

```text
Rename JOHN → JACK

Occurrences:
47

[Cancel] [Rename Everywhere]
```

---

# 49. Validation

The editor should detect structural issues.

Examples:

```text
Dialogue without Character
Parenthetical outside Dialogue
Scene without Scene Heading
Multiple consecutive Character nodes
Invalid Transition placement
```

These should be warnings rather than destructive errors.

---

# 50. Document Validation API

Conceptual:

```typescript
interface ValidationIssue {
  id: string
  type: 'error' | 'warning' | 'info'
  message: string
  nodeId: string
}
```

Example:

```text
⚠ Dialogue has no associated Character.
```

Clicking the warning should navigate to the affected node.

---

# 51. Undo / Redo

Must use ProseMirror transaction history.

The semantic indexes must remain synchronized with document transactions.

Undoing a scene deletion should restore:

- Scene
- Scene relationships
- Character associations
- Element annotations

without requiring the user to manually reconstruct them.

---

# 52. Copy / Paste

Copy/paste must preserve screenplay semantics.

For example, copying:

```text
JOHN

Hello.
```

must preserve:

```text
Character
Dialogue
```

rather than pasting as plain paragraphs.

---

# 53. External Paste

When pasting arbitrary text, the editor should attempt to interpret it.

Potential input:

```text
INT. HOUSE - NIGHT

John walks in.

JOHN
Hello.
```

The semantic engine/input parser should recognize:

```text
Scene Heading
Action
Character
Dialogue
```

If confidence is low, allow the user to correct the element types.

---

# 54. Import/Export Architecture

Although backend functionality is outside the current scope, the document architecture should support:

```text
Internal Model
      │
 ┌────┼─────┐
 ▼    ▼     ▼
JSON Fountain FDX
```

Fountain should be considered an important interchange format.

The internal model remains canonical.

---

# 55. Persistence

Frontend-only MVP can use:

```text
LocalStorage
```

or preferably:

```text
IndexedDB
```

for local project persistence.

The project should be serializable:

```typescript
interface Project {
  id: string
  title: string
  screenplay: JSON
  characters: Character[]
  locations: Location[]
  productionElements: ProductionElement[]
}
```

Future backend synchronization should not require changing the editor architecture.

---

# 56. State Management

Separate:

### Editor State

```text
Tiptap EditorState
```

### Project State

```text
Project
Characters
Locations
Elements
```

### Derived State

```text
Scene Index
Page Count
Character Appearances
Page Metrics
```

Do not store derived values as authoritative project state.

---

# 57. Recommended Frontend Modules

```text
src/
│
├── editor/
│   ├── extensions/
│   │   ├── scene.ts
│   │   ├── sceneHeading.ts
│   │   ├── action.ts
│   │   ├── character.ts
│   │   ├── dialogue.ts
│   │   ├── parenthetical.ts
│   │   ├── transition.ts
│   │   ├── shot.ts
│   │   └── general.ts
│   │
│   ├── commands/
│   ├── shortcuts/
│   ├── inputRules/
│   └── plugins/
│
├── screenplay/
│   ├── model/
│   ├── parser/
│   ├── semantic/
│   ├── validation/
│   └── indexing/
│
├── pagination/
│   ├── layout/
│   ├── measurement/
│   ├── pagination/
│   └── continuation/
│
├── project/
│   ├── characters/
│   ├── locations/
│   ├── elements/
│   └── scenes/
│
└── ui/
    ├── editor/
    ├── sceneNavigator/
    ├── breakdown/
    └── inspector/
```

---

# 58. Separation of Responsibilities

## Tiptap

Responsible for:

- Editing
- Cursor
- Selection
- Transactions
- Undo/redo
- Node structure
- Keyboard interaction
- Rendering

## Semantic Engine

Responsible for:

- Characters
- Locations
- Scenes
- Production elements
- Relationships
- Indexing

## Parser

Responsible for:

- Import interpretation
- External screenplay parsing
- Ambiguous text interpretation

It should NOT be responsible for basic editor structure when the editor already knows the node type.

## Pagination Engine

Responsible for:

- Physical page layout
- Measurement
- Pagination
- Page breaks
- Continuation
- Scene page metrics

## Project Model

Responsible for:

- Canonical entities
- Project metadata
- Entity relationships

---

# 59. Critical Design Rule

The system must follow:

```text
Text ≠ Formatting ≠ Semantic Entity
```

These are separate concepts.

For example:

```text
"pistol"
```

is text.

```text
Prop annotation
```

is semantic metadata.

```text
Courier 12
```

is presentation.

They must not be permanently conflated.

---

# 60. Example End-to-End Flow

User creates:

```text
INT. POLICE STATION - NIGHT
```

The editor creates:

```text
Scene
└── SceneHeading
```

The semantic engine creates:

```text
Scene
location = POLICE STATION
intExt = INT
time = NIGHT
```

User types:

```text
John enters carrying a pistol.
```

The editor creates:

```text
Action
```

User selects:

```text
pistol
```

and tags it as:

```text
PROP
```

The project model now contains:

```text
Scene 1
 ├── Location: POLICE STATION
 ├── Character: JOHN
 └── Prop: PISTOL
```

User creates:

```text
JOHN

Where is she?
```

The editor creates:

```text
Character
Dialogue
```

The semantic engine associates:

```text
JOHN
   ↓
Scene 1
   ↓
Dialogue
```

The pagination engine calculates:

```text
Scene 1
Page: 1
Length: 0.7 pages
```

---

# 61. MVP Scope

The first implementation should include:

### Editor

- Tiptap
- ProseMirror
- Scene
- Scene Heading
- Action
- Character
- Dialogue
- Parenthetical
- Transition
- General
- Keyboard shortcuts
- Slash commands
- Smart Enter behavior
- Character autocomplete

### Project

- Multiple scenes
- Scene navigator
- Character index
- Location index
- Scene metadata

### Semantic

- Character tracking
- Scene tracking
- Location tracking
- Production-element annotations

### Formatting

- Courier 12
- Letter page
- Screenplay margins
- Element-specific widths
- Page visualization
- Page count

### Breakdown

- Select text
- Tag production element
- View tags
- Element index

---

# 62. Phase 2

Add:

- Shot elements
- Advanced production breakdown
- Character reports
- Prop reports
- Location reports
- Scene reports
- Fountain import/export
- FDX import/export
- Script revisions
- Scene locking
- Scene numbering
- Revision colors
- More sophisticated pagination
- Dialogue continuation
- Print/PDF rendering

---

# 63. Phase 3

The architecture should eventually support:

```text
Screenplay
     │
     ├── Breakdown
     │
     ├── Characters
     │
     ├── Locations
     │
     ├── Props
     │
     ├── Wardrobe
     │
     ├── Scheduling
     │
     ├── Stripboard
     │
     ├── Call Sheets
     │
     └── Production Management
```

The screenplay editor should therefore be treated as the **source-of-truth authoring layer for the entire film-production application**.

---

# 64. Non-Goals

The initial frontend implementation should NOT attempt to implement:

- Backend persistence
- Authentication
- Collaboration
- Payments
- Production scheduling
- Call sheets
- Crew management
- Cloud synchronization
- Notifications
- Server-side PDF generation

The architecture should support these later without requiring a rewrite of the editor.

---

# 65. Acceptance Criteria

The editor is considered functionally successful when a user can:

1. Create a project.
2. Create multiple scenes.
3. Create scene headings.
4. Write action.
5. Create characters.
6. Write dialogue.
7. Add parentheticals.
8. Add transitions.
9. Navigate between scenes.
10. Automatically track characters appearing in each scene.
11. Automatically track locations.
12. Tag production elements inside screenplay text.
13. View all production elements associated with a scene.
14. Search the screenplay.
15. Use keyboard shortcuts to switch element types.
16. Use contextual Enter behavior.
17. Reorder scenes.
18. Display the screenplay using screenplay formatting.
19. Calculate physical page count.
20. Estimate runtime from page count.
21. Calculate scene page ranges.
22. Preserve semantic structure when copying/pasting.
23. Undo/redo screenplay changes without corrupting semantic indexes.
24. Detect basic structural screenplay errors.
25. Maintain a clean separation between screenplay content, semantic metadata, and presentation.

---

# 66. Final Architecture Principle

The most important implementation decision is:

```text
                SCREENPLAY
                    │
        ┌───────────┼───────────┐
        │           │           │
        ▼           ▼           ▼
    EDITOR      SEMANTICS    PAGINATION
        │           │           │
        ▼           ▼           ▼
     Tiptap      Entities    Physical Pages
     Nodes       Indexes     Layout
```

The editor should **never become the database**.

The parser should **never become the editor**.

The pagination engine should **never become the source of truth**.

The screenplay domain model connects them.

This architecture allows the application to start as a sophisticated screenplay editor and eventually grow into a complete StudioBinder-style film project management platform without having to replace the underlying document model.
