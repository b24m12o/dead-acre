/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// What you say out loud. Each of the three has their own way of saying the same few things: the Soldier clipped and
// by the book, the Deputy dry and stubborn, the Gunslinger never quite serious. tools/voices/hero.py reads this file
// and records every line into the voice bundle (speaker codes Pranger, Pbreacher, Pgrenadier), so a line here must
// match its recording word for word: change one, run the tool again. Each voice is a blend of two of the model's
// voices, so none of the three sounds like Hawk or like any of your backups.
export const HERO_VOICES = {
  ranger: { mix: { am_michael: 0.5, am_eric: 0.5 }, speed: 1.12 },
  breacher: { mix: { am_fenrir: 0.45, am_onyx: 0.55 }, speed: 1.02 },
  grenadier: { mix: { am_puck: 0.5, am_liam: 0.5 }, speed: 1.04 },
};
export const HERO_LINES = {
  ranger: {
    reload: ['Reloading.', 'Changing mags.', 'Loading.'],
    empty: ["I'm dry.", 'Empty.', 'Out of rounds.'],
    hurt: ["I'm hit.", 'Taking hits.', 'That one landed.'],
    low: ["I'm in bad shape.", "Can't take many more of those."],
    heal: ['Patched up.', 'Good to go.'],
    streak: ['Targets down.', 'Keep them coming.', 'Hold the line.'],
    boss: ["What in God's name is that?", "New contact. It's big."],
    clear: ['Sector clear.', "Night's over. Still standing."],
    quiet: ['One less.', 'Quiet. Good.'],
    horde: ["That's a whole lot of them.", 'Too many to count.'],
    grab: ['Get off me!', 'Let go!'],
  },
  breacher: {
    reload: ['Loading up.', 'Shells in.', 'Reloading.'],
    empty: ["I'm out.", 'Empty.', 'Nothing left in it.'],
    hurt: ['Damn it!', 'That one got me.', "I've had worse."],
    low: ["I'm bleeding bad.", 'Not going down here.'],
    heal: ["That'll hold.", 'Better.'],
    streak: ['Stay down.', 'Anybody else?', 'Precinct Nine says goodnight.'],
    boss: ['Now what is that?', "That's a big one."],
    clear: ["Street's clear.", "Shift's over."],
    quiet: ['Go to sleep.', 'Quiet now.'],
    horde: ["That's half the county.", 'Lord, look at them all.'],
    grab: ['Hands off!', 'Get off!'],
  },
  grenadier: {
    reload: ['Loading.', 'Six more.', 'Hold that thought.'],
    empty: ['Click. Wonderful.', "I'm out.", 'Well, that was the last one.'],
    hurt: ['Ow. Rude.', 'That stung.', 'Careful, now.'],
    low: ['Getting leaky.', 'This is going badly.'],
    heal: ['Good as new. Nearly.', 'Much obliged.'],
    streak: ['Next.', 'Like fish in a barrel.', 'Line up, now.'],
    boss: ["Well, you're an ugly one.", 'That is a lot of zombie.'],
    clear: ["And that's that.", 'Sunrise. About time.'],
    quiet: ['Night, friend.', 'Not a sound.'],
    horde: ["Well. That's a crowd.", "Should've kept riding."],
    grab: ['Let go of me!', 'Off!'],
  },
};
// per kind: [seconds before you say that kind of thing again, chance it is said, priority]. Priority 2 is said even
// right after another line. You never talk over Channel 9 or over one of your people
export const HERO_RULE = {
  reload: [24, 0.3, 0],
  empty: [14, 0.75, 1],
  hurt: [10, 0.5, 1],
  low: [50, 1, 2],
  heal: [20, 0.7, 0],
  streak: [32, 0.6, 0],
  boss: [40, 1, 2],
  clear: [0, 0.75, 1],
  quiet: [26, 0.4, 0],
  horde: [60, 1, 1],
  grab: [12, 0.8, 2],
};
// Whoever is holed up in the garage with the truck (journey.js): the one who raises the door for you, and drives.
// Recorded by the same tool, speaker code Pdriver
export const DRIVER = {
  voice: { mix: { am_adam: 0.5, am_echo: 0.5 }, speed: 1.06 },
  lines: {
    door: [
      "Get in here, quick! Tank's bone dry. Find me fuel and I'll drive us both out.",
      "You're alive! Good. She's got no fuel. Bring me some and we both get out of here.",
    ],
    doorFull: ["Is that fuel? Pour it in, there at the side. I'll get her started."],
    pour: ["That's it. Keep pouring.", 'Every drop, now.'],
    go: [
      "She's running! Get in the back. The gun up there is yours.",
      "That's her! Climb in the back and keep them off us.",
    ],
  },
};
