/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Prints a fingerprint of the program: the joined source compiled with comments, whitespace and
// formatting removed. Two versions with the same fingerprint are the same program.
import { createHash } from 'node:crypto';
import { minify } from 'terser';
import { joinSource } from './lib/source.mjs';
const { script } = joinSource();
const out = await minify(script, { compress: false, mangle: false, format: { comments: false, beautify: false } });
console.log(createHash('sha256').update(out.code).digest('hex').slice(0, 16), out.code.length);
