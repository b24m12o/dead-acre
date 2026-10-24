/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The test build: the game, plus one hook that runs test code inside the game's own scope.
import '../../src/index.js';
window.__eval = c => eval(c);
