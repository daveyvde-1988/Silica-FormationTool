# Silica Formation Editor

Open index.html in a browser; no installation or build is required. Rename the selected formation in Settings: the dropdown, title and command preview update immediately. Choose follow, move, commander or attack independently of its name. New formations use 20 metres per full grid interval (10 metres per half-grid snap). Loading preserves the saved scale.

Load JSON replaces the current set. Export saves all formations; keep one formation to export a single-entry file. silica-formations example.json demonstrates a rotated follow formation at a custom scale and a fixed-orientation commander formation, including both repair units.

## Updated controls and export

The team filter offers All teams, Alien, Centauri and Sol. The function filter offers All functions, Move, Follow, Attack and Commander. Both filters apply together without removing anything from the document. New uses the selected team and function. An empty team shows no editable layout; New creates a formation for that team. Export always includes every team.

Direction is set by dragging the arrow; the degrees field is removed. Direction sensitivity and saved directionDegrees retain their existing meaning. Placement buttons are under Place, the centre button includes the pink cross, and zoom is at the top of the right panel.

Copy selected nodes with Ctrl+C (Cmd+C on macOS), and paste with Ctrl+V, or use Copy nodes / Paste nodes for the editor's internal clipboard. Copies preserve relative positions, preferences and unit choices, get fresh IDs, and appear with a half-grid offset per paste constrained by the grid boundary. Cross-team pasting drops unavailable units. Native shortcuts also work between editor windows; text-field copy/paste stays normal. Auto-preference recalculates pasted preferences when enabled. At the grid edge a paste can overlap its source; drag the selected copy into place.

Export ZIP downloads one silica-formations.zip containing version-3 silica-formations.json for all teams. Extract that JSON for the mod or load it back into the editor. PNG image export and its checkbox have been removed. ZIP creation works offline without external libraries.

## Grid editing

Click a colored placement entry to select that numeric position preference for placement, then click empty grid positions to place dots. The active placement button stays highlighted. Escape returns to Select / drag.

Shift-click dots to add or remove them from the selection. Drag any selected dot without Shift to move the group while preserving its shape; the grid boundary limits the whole group. The inspector can change the selected group's numeric position preference and preferred units, or delete it. Preferred-unit checkboxes show a partial check when only some selected dots prefer that unit. Checking adds that unit to every selected dot; unchecking removes it from every selected dot while preserving their other preferences. Dot sizes update immediately. Delete/Backspace also deletes the selection when not editing a field. Right-click deletes only the clicked dot. Click empty space in Select mode to clear the selection. Select one dot to edit its coordinates.

Use the grid zoom − / + buttons (25–300%), click the percentage to reset to 100%, or Ctrl-scroll over the grid to zoom around the pointer. Scroll the workspace to reach other areas. Zoom and selection are view state only; JSON format, metre scale and coordinates are unchanged.

## Version 3 JSON contract

The document has format: "silica-formations", version: 3 and a formations array with one or more entries. Each entry contains:
- name: command selection name; function: "follow", "move", "commander" or "attack". Intended commands are /followformation "name", /moveformation "name", /commanderformation "name", /attackformation "name".
- team: "Sol", "Centauri" or "Alien"; metresPerNode: positive metres per full grid interval.
- directionSensitive: boolean; directionDegrees: editor arrow clockwise from screen-up (0 up, 90 right).
- coordinateSpace: "local-right-forward" when sensitive, otherwise "world-xz".
- origin: {x: 0, z: 0}; the centre cross is always the sole coordinate origin.
- slots: ordered positions with x and z in metres, role (priority), preferredUnits (display names), and derived sizeScale.
- editor.centreGrid and slots[].editor.grid: editor grid coordinates, for exact layout restoration. The runtime ignores these.

Roles: top = Top preferred (green), repair = Repair preferred (light blue), purple = Backup + repair, backup = Backup, last = Less preferred. Si_Formation maps these roles to bounded candidate rankings; see ../README.md for exact runtime rules.

sizeScale is derived: any existing large-category unit wins (2); otherwise any non-small unit gives 1; only a nonempty all-small selection gives 0.5; empty gives 1. Existing small/large categories remain in core.js. Repair Truck and Repair Rig are normal-sized and unchecked on new dots.

Version 1/2 imports migrate their old grid/fixed offsets without changing the editor layout or saved scale. Export always writes version 3. Unknown versions are rejected. Version 3 validates functions, teams, priorities and roster names instead of silently dropping them. Grid positions are preserved on import, not snapped again. Pointer movement and coordinate edits snap to half-grid positions; rotated coordinate edits inverse-transform both axes before snapping. Displayed/exported metres share the same conversion (six decimal places); editor metadata preserves exact placement.

## Coordinate conversion and Unity handoff

Inspected FollowFormation.cs: Facing flattens and normalizes the leader heading; TryScatter uses anchor + right * offset.x + forward * offset.y, with right = Vector3.Cross(Vector3.up, forward). JSON z therefore corresponds to the current solver's Vector2.y.

Let dx = (slot.grid.x - centreGrid.x) * metresPerNode and dz = (slot.grid.z - centreGrid.z) * metresPerNode. Grid +X is screen-right; grid +Z is screen-up. For a sensitive formation, a = directionDegrees in radians:
- x = dx*cos(a) - dz*sin(a) (local right)
- z = dx*sin(a) + dz*cos(a) (local forward)

The arrow sets the basis, never a second origin. At 90 degrees a dot one grid interval screen-right has x=0, z=20 at default scale.

At runtime select a horizontal normalized forward F and R = Cross(up, F). Desired world position = centre + R*x + F*z. Do NOT apply directionDegrees again: its rotation is already removed during export. That angle restores the editor drawing only.

When insensitive, ignore the arrow entirely: x=dx, z=dz and desired world position = centre + Vector3(x, 0, z). Screen-up is fixed world +Z, screen-right fixed world +X. Neither mode multiplies the exported offsets by metresPerNode again. Terrain/navigation projection still supplies Y.

## Runtime integration

Confirmed in ../../../UserData/UnitBalance_cfg/Si_UnitBalance_Dump.json:
- Centauri Repair Truck -> ObjectInfo_Cent_Light_RepairTruck (Team_Human_Centauri)
- Sol Repair Rig -> ObjectInfo_Sol_Light_RepairRig (Team_Human_Sol)

preferredUnits intentionally contains readable roster names, not prefab IDs. Resolve by team and game ObjectInfo during mod loading; verify the remaining roster names against game definitions rather than assuming their spelling is an internal identifier. Current mod repair detection is AIVehicleAgent.CanRepair.

The Si_Formation project now loads this version-3 format. See ../README.md for installation, commands, assignment rules, curved-follow interpretation and API limitations. Si_Formation 2.1 supports these files; use /formationstatus to inspect your selections. Add an attack definition explicitly: the current user JSON has no attack entries.

example-all-functions.json provides four separate Sol definitions (follow, move, commander and attack) for editing/testing; it is not automatically installed in UserData/Formations_cfg.

The editor keeps readable names. Runtime mappings use installed ObjectInfo identifiers; Flak Truck and Rocket Truck retain legacy editor labels mapped to Flak Car and Rocket Tank respectively.

Attack was added to the function selector/import/export without changing format version 3 or coordinate conventions. A four-function export/import/export check passed. Follow/move/commander/attack remain separate explicit function values.


## Auto-shapes and distance preferences

Choose a shape, total node count (1–4096), size and Fill shape, then Generate / replace all. Generation replaces every dot in the current formation, not just selected dots; generated nodes start with the selected numeric placement preference, a compatibility role of top, and empty preferred-unit choices. Undo shape restores the layout before generation. While live generation is active, changing shape/count/size/fill regenerates that same layout without appending nodes. Manual geometry or inspector edits end live generation and clear its Undo snapshot; switching formations or loading JSON also ends it. Controls alone do not replace existing dots until Generate is pressed.

Shapes snap to the existing half-grid positions in [-25, 24] on both axes. Count is the total, including the interior. Duplicate positions are removed. Size is a radius/half-width in grid intervals. Outline layouts use the size slider; filled layouts choose their size automatically. Both stay within the grid around the pink formation centre. If there are too few distinct positions for the requested count, the UI reports actual/requested counts instead of stacking dots. For outlines increase size or enable Fill; for filled layouts reduce count or move the centre inward. Shapes are deterministic for the same controls and centre.

| Shape | Outline/path | Fill |
| --- | --- | --- |
| Circle | Complete 360° circumference | Full disc |
| Rectangle | Wider than tall (5:3) | Rectangle interior |
| Square | Equal width and height | Square interior |
| Triangle | Three-sided perimeter | Triangle interior |
| Hexagon | Six-sided perimeter | Hexagon interior |
| Arrow | Concave arrow perimeter | Arrowhead and shaft interior |
| Line | Straight horizontal path | Disabled: no interior |
| Staggered line | Alternating zigzag path | Disabled: no interior |
| Diamond | Narrow diamond perimeter | Diamond interior |
| Semi-circle | Open 180° curve | Half-disc |
| Arc | Open 120° curve | 120° circular sector |

Filled layouts automatically resize for the requested node count, independent of the previous size slider setting. The size slider is disabled while Fill is active and displays the generated size. A bounded capacity search over half-grid sizes up to 24 chooses a compact fit from twelve lattice/sweep packing attempts, then keeps a dense interior subset rather than spreading dots far apart. The centre position is available. Normal generated dots have radius 0.45 plus their outline, so adjacent full-grid positions leave only a small edge gap. Shape boundaries, half-grid snapping and arbitrary counts can still leave small gaps. If the grid cannot accommodate the requested count, the generator retains the largest available layout and reports overlap or a count shortfall. The packing search is heuristic, not a proof of optimality. Generated nodes have empty unit choices; subsequently assigning larger units can cause overlap and does not automatically move manually edited nodes.

Auto-preference is opt-in per formation. Its Gradient slider runs from 0 (low: orange/red) to 100 (high: green/yellow), default 50. It updates actual numeric preference values on the grid immediately while auto mode is enabled; moving it never moves or regenerates nodes. Equal normalized distances get equal values. Add/delete/move/centre changes recompute preferences for generated and manual nodes alike.

The gradient follows the convex outer envelope of the current dot layout, independently of the centre cross. Its centre is the mean of the envelope vertices; distances are normalized against each envelope edge, giving triangle/square/polygon-shaped bands and translation-invariant colors. For a line it uses distance from the layout midpoint. Concave layouts (such as arrows) use their convex envelope rather than following inward notches. A bias of (50 - gradient) × 0.013 is added and clamped into four equal bands [0, 1, 2, 4]. Increasing the slider makes preferences no worse. Outline-only formations can have one color because all dots lie on the envelope. The slider is disabled when auto mode is off.

| Color | Saved preference | Runtime meaning |
| --- | --- | --- |
| Green | 0 | First-choice tier |
| Yellow | 1 | Backup tier |
| Orange | 2 | Less preferred tier |
| Red | 4 | Least preferred numeric tier |
| Red (existing legacy value) | 3 | Same red tier as 4; saved value preserved |

The Priority dropdown has been removed for single and multiple selections. The separate Distance preference control remains for manual editing. Turning Auto-preference off retains assigned values. Existing value 3 is displayed explicitly as a legacy red level and remains available in the inspector when selected. New placement and automatic assignment use the four main levels. Preferred-unit checkboxes still operate independently; they break ties within a position tier in-game. A unit checkbox is not a replacement for position ranking.

Existing role fields are preserved on import/export because the runtime still requires them and uses them for slots without a numeric preference. Those legacy slots retain their role colours; the runtime converts top/backup/last to green/yellow/orange tiers. They are not silently converted by opening a file. Choosing a numeric value or enabling Auto-preference is the explicit conversion action; even then the original role remains saved as compatibility data. New nodes use role top plus a numeric preference. Preferred-unit assignments and their derived sizes remain unchanged.

Version 3 JSON retains slots[].preference (integer 0–4), editor.autoPreference (boolean), and now saves editor.autoPreferenceGradient (0–100). Gradient metadata is ignored by the runtime. Opening a file never recalculates or assigns node preferences, even if auto mode was saved enabled. A missing gradient setting defaults to 50 without applying it. The optional numeric format remains compatible; strict whole-group colour filling requires Si_Formation 2.5.0.

**Compatibility:** numeric preferences require Si_Formation 2.3.1 or later. Older mods ignore that field and use the saved legacy roles. The approved runtime compatibility change validates the optional field and uses it as the candidate priority tier, independently of whether the unit can repair. Without it, original role ranking is unchanged. Preferred-unit matching still breaks ties within the tier, then stable slot order. No formation JSON in UserData was edited.

Si_Formation 2.5.0 assigns across the whole selected group, exhausting green, then yellow, orange and red. A staged search replaces the old first-six/128/256 candidate cutoffs. Unit-specific navigation/spacing rejection does not make a position unavailable to other units. Successful assignments persist through up to three complete retry passes; retries do not correspond to colours. See the mod README for scheduler and navigation limits.

## Tactical fill

Tactical fill replaces Tactical shape. It creates symmetric left/right pairs about the centre's vertical grid axis, leaving the centre empty. Odd counts can use axis positions. The Size slider stays enabled; Fill shape and Tactical fill are mutually exclusive. Space/boundary limits can reduce the requested count instead of breaking symmetry or stacking dots. As before, press Generate first to enable live shape updates.

## Auto backup positions and physical footprints

**Auto backup positions** adds yellow one grid interval and orange two intervals opposite the arrow direction from each green dot. Unit/type preferences are copied. It then adds unrestricted red positions beside the green/yellow/orange positions, preferring the outward side and trying the other side if occupied. Existing positions are retained. Boundary/occupied locations and the 4096-position limit are reported as skips. Automatic colour gradients are turned off. **Undo backup positions** restores the layout before the button was used.

**Load game footprints** reads the updated mod's UserData/Formations_cfg/metadata/footprints.json, written after the server initializes game definitions. It contains actual cached local physical bounds. The editor remembers imported measurements when browser storage is available. A specific unit shows its width/length; several units or a category show the maximum width and maximum length among their preferred units. Missing measurements and unrestricted positions have a labelled dashed generic 8 × 4 m footprint, not invented game measurements. Metres per grid position immediately changes the rendered width/length. The existing dot still marks the assigned centre.

Editor logic checks and production allocator checks live in the mod's PriorityChecks directory. No browser or live-game validation is implied by these checks.

## In-game menu numbering (future mod integration)

Use In-game menu number in Settings to assign an exact option from /2 through /9999. Numbers are independent per team/function. Choosing an occupied number swaps that entry with the selected formation. New/duplicated formations get the lowest unused number; changing team/function assigns the lowest free number in the new group. Deleting leaves a gap; renaming does not change the number. The formation dropdown displays the numbers.

/1 default is reserved in every team/function list as a virtual entry, not an editable formation. A formation actually named Default remains a custom entry starting at /2. No dummy formation or default PNG is exported. The future default gameplay action still needs to be specified.

Version 3 adds top-level menu: {"defaultOption":1,"defaultLabel":"default"} and formations[].menuOrder (integer 2–9999). Export includes all teams/functions and preserves numbers; loading rejects invalid or duplicate numbers within a team/function. Legacy files without numbers get the lowest free numbers in document order, after reserving explicit numbers. This changes only menu metadata, not geometry or slot priorities. Uniqueness across separate exported files must also be checked by the future mod loader.

The current mod reads menuOrder and reserves /1; duplicate numbers are rejected across loaded files.


## Unit and type preferences

Select one or more dots to edit **Preferred unit types** and the existing **Preferred units** checkboxes. Individual units are grouped by the mod's formation categories. Anti-air, Scout and Artillery are separate; the requested vehicle mappings are listed in the mod README. Unlisted units retain their native category. Harvester is not selectable and is removed from legacy preferences when loaded. Type and individual selections supplement each other. Within a dot priority tier, the mod ranks individual matches first, then type matches, unrestricted dots, and nonmatching fallback dots. Repair is an ordinary preference; legacy repair/purple roles are migrated on import to top/backup plus Repair, preserving numeric priorities.

One checked preference shows a tactical game icon on the dot (representative unit artwork for a type). Two or more checked preferences show `+`. Hover a dot to read its selections. The colored border continues to show priority. New JSON exports contain optional `preferredTypes` arrays and retain `preferredUnits`; older JSON imports remain supported. Use the updated DLL for type preferences.

`game-icons.js` embeds icons and unit classifications extracted from the locally installed Silica client. Artwork belongs to the game's rights holders. Keep this file with the offline editor. No client files are modified and no external icon download is needed.

## Clear preferences and select matching priorities

The right sidebar's **Formation preferences** section has **Clear all preferences**. It applies only to the current formation: unit and unit-type checkboxes are cleared, all dots become equal priority 0 (green), ordinary roles reset to top, and auto-preference is disabled. Positions, formation settings, and other formations are unchanged.

Double-click a node to replace the selection with all nodes in the current formation having the same effective priority level. This includes equivalent legacy roles and numeric priorities; individual/type choices do not affect the match. The shortcut is documented in the right sidebar. Dragging does not trigger it.

All left- and right-sidebar sections can be expanded/collapsed using their headings, including Grid Zoom, Formation preferences, Selected nodes / position, Priority, Preferred unit types, Preferred individual units, and Coordinates. Open/closed state is retained during the current editor session.


The shared Exclusive checkbox in Unit and type exclusivity reserves selected dots for checked individual units OR checked unit types. Both lists can be used together. With neither, the dot stays empty. Saved as forceExclusive in JSON; requires the updated Si_Formation build. Copy/import/export and yellow/orange backups preserve it; red backups remain unrestricted. Clear all preferences clears exclusivity.
