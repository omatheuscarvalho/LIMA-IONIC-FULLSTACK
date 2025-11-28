## Fix opencv.js 'instanceof' lint warnings

This small script searches the repository for files named `opencv.js` and replaces occurrences of the ambiguous `!err instanceof SomeError` with the correct `!(err instanceof SomeError)` construction.

Usage:

1. Run from workspace root (PowerShell or any shell with Node.js installed):

   npm run fix-opencv-instanceof

2. The script will create `.bak` backups for any file it modifies.

Why this exists:

Minified builds of OpenCV.js used in the project contain the pattern `!err instanceof` which is parsed as `(!err) instanceof ...` and is both ambiguous and unsafe. This script fixes those occurrences so the build warnings go away.

Note: if you update OpenCV.js (replacing the file), re-run this script to apply the fix automatically.
