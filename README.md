# Silica Formation Editor

Open index.html in a browser; no installation or build is required. Rename the selected formation in Settings: the dropdown, title and command preview update immediately. Choose follow, move, commander or attack independently of its name. New formations use 20 metres per full grid interval (10 metres per half-grid snap). Loading preserves the saved scale.

Load JSON replaces the current set. Export saves all formations; keep one formation to export a single-entry file. silica-formations example.json demonstrates a rotated follow formation at a custom scale and a fixed-orientation commander formation, including both repair units.

## Updated controls and export

The team filter offers All teams, Alien, Centauri and Sol. The function filter offers All functions, Move, Follow, Attack and Commander. Both filters apply together without removing anything from the document. New uses the selected team and function. An empty team shows no editable layout; New creates a formation for that team. Export always includes every team.

Direction is set by dragging the arrow; the degrees field is removed. Direction sensitivity and saved directionDegrees retain their existing meaning. Placement buttons are under Place, the centre button includes the pink cross, and zoom is at the top of the right panel.

Copy selected nodes with Ctrl+C (Cmd+C on macOS), and paste with Ctrl+V, or use Copy nodes / Paste nodes for the editor's internal clipboard. Copies preserve relative positions, preferences and unit choices, get fresh IDs, and appear with a half-grid offset per paste constrained by the grid boundary. Cross-team pasting drops unavailable units. Native shortcuts also work between editor windows; text-field copy/paste stays normal. Auto-preference recalculates pasted preferences when enabled. At the grid edge a paste can overlap its source; drag the selected copy into place.

Export ZIP downloads one silica-formations.zip archive containing the version-3 silica-formations.json. Extract that JSON for the mod or to load it back into the editor. The separate Include PNG images checkbox (initially checked) optionally adds one PNG per formation, including manually placed layouts. Uncheck it for a ZIP containing only the JSON; no images are generated. PNGs are cropped around visible dot edges with a small margin and use names such as Move_Sol_Triangle.png. Invalid filename characters are replaced; duplicate names receive numeric suffixes. The centre marker is included only if inside the crop. Images omit selection outlines and are independent of view zoom. All files are packaged before the single download is requested, avoiding browser limits on repeated downloads. An image error aborts export with its filename instead of downloading an incomplete archive. ZIP creation works offline without external libraries; files are stored without additional compression. An empty formation gets a small centre-only preview.

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
| Red (existing legacy value) | 3 | Preserved between 2 and 4; never silently renumbered |

The Priority dropdown has been removed for single and multiple selections. The separate Distance preference control remains for manual editing. Turning Auto-preference off retains assigned values. Existing value 3 is displayed explicitly as a legacy red level and remains available in the inspector when selected. New placement and automatic assignment use the four main levels. Preferred-unit checkboxes still operate independently; they break ties within a position tier in-game. A unit checkbox is not a replacement for position ranking.

Existing role fields are preserved on import/export because the runtime still requires them and uses them for slots without a numeric preference. Those legacy slots keep their original role colors and unit-dependent ranking, with an inspector explanation. They are not silently converted by opening a file. Choosing a numeric value or enabling Auto-preference is the explicit conversion action; even then the original role remains saved as compatibility data. New nodes use role top plus a numeric preference. Preferred-unit assignments and their derived sizes remain unchanged.

Version 3 JSON retains slots[].preference (integer 0–4), editor.autoPreference (boolean), and now saves editor.autoPreferenceGradient (0–100). Gradient metadata is ignored by the runtime. Opening a file never recalculates or assigns node preferences, even if auto mode was saved enabled. A missing gradient setting defaults to 50 without applying it. The existing optional numeric format already works with deployed Si_Formation 2.3.1; no runtime changes or rebuild were necessary for this editor update.

**Compatibility:** numeric preferences require Si_Formation 2.3.1 or later. Older mods ignore that field and use the saved legacy roles. The approved runtime compatibility change validates the optional field and uses it as the candidate priority tier, independently of whether the unit can repair. Without it, original role ranking is unchanged. Preferred-unit matching still breaks ties within the tier, then stable slot order. No formation JSON in UserData was edited.

Obstructed candidates still lead to later ranked candidate attempts; a numeric preference is a ranking, not an eligibility filter. The existing runtime bounds remain: at most six terrain projections per unit per attempt, up to 256 ranked candidates for a one-shot move and 128 for follow. A complete one-shot placement failure can still leave the entire order to vanilla, and failed follow slots retain native follow. This editor change does not remove those existing limits or promise fallback beyond them.

## Verification for this update

The editor is static HTML/JavaScript and has no bundler or compiled artifact. All three JavaScript files passed syntax compilation. No behavioral, browser or in-game tests were run for this update; the user handles testing. Earlier generated example JSON files were left untouched, including their saved values and any centre nodes. Centre exclusion applies to newly generated filled layouts, not existing layouts merely opened from disk.

Files changed: index.html, editor.js, core.js, shapes.js, README.md. No mods, installed DLLs or live JSON configuration were changed.

Please verify the gradient at 0/50/100 and intermediate positions; manual and generated node updates; saved metadata and values reopening unchanged; auto-off manual edits; legacy roles/value 3 and preferred units remaining intact; filled shapes with odd/even counts, dense grids and an off-centre origin; compact automatic sizing, optional centre nodes and no duplicate positions. In-game, check green before yellow before orange before red for both ordinary and repair units, including occupied/obstructed alternatives and preferred-unit ties.

Runtime limitation remains unchanged: candidate search is bounded (six terrain projections per unit per attempt), so a complete placement failure can still fall back to native orders. The editor cannot eliminate that fallback, and no runtime change was made.

### Tactical shape

Tactical shape is the checkbox directly below Fill shape. It restores the previous manually sized fill: dots are spread throughout the shape, the snapped centre stays empty, and the existing overlap-aware packing is retained. The Size slider remains enabled. Fill shape and Tactical shape are mutually exclusive; leaving both unchecked generates an outline/path. Both area modes are disabled for line and staggered line. As with other shape controls, press Generate first; changes update an active generated shape live. Tactical mode may need a larger size or fewer dots if overlap is reported.

## In-game menu numbering (future mod integration)

Use In-game menu number in Settings to assign an exact option from /2 through /9999. Numbers are independent per team/function. Choosing an occupied number swaps that entry with the selected formation. New/duplicated formations get the lowest unused number; changing team/function assigns the lowest free number in the new group. Deleting leaves a gap; renaming does not change the number. The formation dropdown displays the numbers.

/1 default is reserved in every team/function list as a virtual entry, not an editable formation. A formation actually named Default remains a custom entry starting at /2. No dummy formation or default PNG is exported. The future default gameplay action still needs to be specified.

Version 3 adds top-level menu: {"defaultOption":1,"defaultLabel":"default"} and formations[].menuOrder (integer 2–9999). Export includes all teams/functions and preserves numbers; loading rejects invalid or duplicate numbers within a team/function. Legacy files without numbers get the lowest free numbers in document order, after reserving explicit numbers. This changes only menu metadata, not geometry or slot priorities. Uniqueness across separate exported files must also be checked by the future mod loader.

The deployed mod does not yet honor menuOrder or the reserved /1 entry. Use MOD_MENU_ORDER_PROMPT.md as the next implementation request.


## Unit and type preferences

Select one or more dots to edit **Preferred unit types** and the existing **Preferred units** checkboxes. Individual units are grouped by the installed game's actual UnitType. Type and individual selections supplement each other. Within a dot priority tier, the mod ranks individual matches first, then type matches, unrestricted dots, and nonmatching fallback dots. Repair is an ordinary preference; legacy repair/purple roles are migrated on import to top/backup plus Repair, preserving numeric priorities.

One checked preference shows a tactical game icon on the dot (representative unit artwork for a type). Two or more checked preferences show `+`. Hover a dot to read its selections. Icons also appear in PNG exports. The colored border continues to show priority. New JSON exports contain optional `preferredTypes` arrays and retain `preferredUnits`; older JSON imports remain supported. Use the updated DLL for type preferences.

`game-icons.js` embeds icons and unit classifications extracted from the locally installed Silica client. Artwork belongs to the game's rights holders. Keep this file with the offline editor. No client files are modified and no external icon download is needed.

## Clear preferences and select matching priorities

The right sidebar's **Formation preferences** section has **Clear all preferences**. It applies only to the current formation: unit and unit-type checkboxes are cleared, all dots become equal priority 0 (green), ordinary roles reset to top, and auto-preference is disabled. Positions, formation settings, and other formations are unchanged.

Double-click a node to replace the selection with all nodes in the current formation having the same effective priority level. This includes equivalent legacy roles and numeric priorities; individual/type choices do not affect the match. The shortcut is documented in the right sidebar. Dragging does not trigger it.

Right-sidebar sections can be expanded/collapsed using their headings, including Grid Zoom, Formation preferences, Selected nodes / position, Priority, Preferred unit types, Preferred individual units, and Coordinates. Open/closed state is retained during the current editor session.
