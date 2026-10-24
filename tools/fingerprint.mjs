/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Prints a fingerprint of the program: src/ bundled with comments, whitespace and formatting removed (names
// kept). Two versions with the same fingerprint are the same program.
import { createHash } from 'node:crypto';
import { bundle } from './lib/source.mjs';
const code = await bundle({ fingerprint: true });
console.log(createHash('sha256').update(code).digest('hex').slice(0, 16), code.length);
