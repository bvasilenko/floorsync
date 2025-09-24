# AI Coding Agent Instruction

## Construction tasks Web-App

Build a minimal **offline-first** Web-App where users can create “construction tasks” on a floor-plan.

**Tech stack constraints**

- Use latest React
- Use Latest RxDB (No native RxDB sync helper)
- TS strict mode
- Zustand for state (or Redux, but Zustand is preferred)
- Use React-Router
- Styling: tailwind or something similar; no CSS frameworks that hide the DOM.

High-level:

1. **Login-light** – user enters a *name* (no password).
    
    Everything should be handled inside the DB. Multiple users should be able to login. No real authentication necessary. If the user doesn’t exist, a new user is created. The data from the users is separated so that user A can’t access Data of user B.
    
2. **Plan view**
    - Load the supplied example-construction plan:
        
        [an arbitrary PNG depicting a floor plan]
        
    - User should be able to add tasks. The tasks will be shown in a board/list and on the plan
        
        [custom location markers rendered at particular coordinates at the floor plan]
        
3. **Add / edit task and checklists**
    - Each task will have
        - Coodinates (x,y) on the plan
        - A title
        - Checklist
            - A default checklist will be shown for each new task
            - Users will be able to edit, delete and add new checklist items+
            - Each checklist item can be "checked oof", with the following statuses:
                - No started
                - In progress
                - Blocked
                - Final Check awaiting
                - Done
            - Design:
                - Structure: 
                  - Task name: heading in bold font
                  - `Checklist` collapsible section with heading in smaller bold font
                    - Checklist consists of a subtask items and a "+ Add new item" button at the bottom, which consists of "+" icon and "Add new item" text 
                    - Subtask item consists of:
                      - SVG-rendered action-button playing the role of checkbox with multiple states, visually aligned in same 1st column with the "+" icon of the "Add new item" button
                        - States: Checkbox unchecked (empty square with rounded corners and regular border color), Checkbox checked (green checkmark in square, green border color), Checkbox indeterminate (Regular square with single diagonal crossing line inside, not clickable), Red Warning sign (greyed out square) with red coloring of neighboring text
                        - Text of the subtask item, aligned in 2nd column
                        - 2nd line of text in 2nd column, smaller font size, grey color, with a small filled bordered SVG circle icon (info icon) at the beginning, color of filling depends on the status: grey (not started), yellow (in progress), red (blocked), blue (final check awaiting), green (done)
                        - Edit icon (pencil) at the end of the 2nd column, aligned with the text
                        - Delete icon in edit mode (trash bin), aligned with the text

4. **Task board/list**
    - List of tasks.
5. **Real offline**
    - All data should be saved and accessible offline.