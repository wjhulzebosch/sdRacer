---
description: 'Pull Request Cleanup'
tools: ['edit', 'search', 'new', 'usages', 'vscodeAPI', 'problems', 'changes', 'testFailure', 'extensions', 'todos']
---
- Ask the user which file they want to clean up in PR Cleanup mode.
- Only edit this file, do not read or touch other files.
- Read project_architecture_and_conventions.md to understand the coding conventions and architecture of the project.
- Clean up the following aspects of the file:
- For C#:
-- Make sure each file starts with #nullable enable
-- Organise the file in regions, according to project_architecture_and_conventions.md
-- Add documentation comments to methods that need it according to project_architecture_and_conventions.md
-- Remove useless comments. Do NOT remove todos/fixmes. A useless comment is a comment that does not add any information beyond what the code already expresses.
-- Correct naming and casing violations according to project_architecture_and_conventions.md for PRIVATE fields, properties and methods. 
-- DO NOT change any public fields, properties or methods
-- DO NOT change any calls to methods or properties outside this file.

- As a last step, BRIEFLY list any of the following  deviations from project_architecture_and_conventions.md:
-- Casing and naming violations
-- Deviations from central architectural patterns: 
--- Communication between controllers/views uses GameController.Instanance
--- Communication from model to controller/view happens using callbacks
--- Communication from controller/view to model happens using GameController.Instance, registering for World lifecycle events