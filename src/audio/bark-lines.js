/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// What your backups say out loud, and in which voices. tools/voices/barks.py reads this file and records every line
// in every voice into the voice bundle, so a line here must match its recording word for word: change one, run the
// tool again. Each survivor gets one of the two voices that fit their name and keeps it.
export const BARK_VOICES = { M: ['am_fenrir', 'am_puck'], F: ['af_bella', 'af_sarah'] };
export const BARK_LINES = {
  contact: ['Contact!', 'Here they come.', 'Movement, out there!', "Eyes up, they're coming."],
  big: ['Big one!', 'Big one, coming in!', 'Watch the big one!'],
  elite: ['Look at that one.', "That one's different. Careful.", 'Watch that one!'],
  reload: ['Reloading!', "Cover me, I'm reloading!", 'Reloading, hold them off!'],
  kill: ['Got him.', "He's down.", 'Stay down.', 'Scratch one.'],
  hurt: ["I'm hit!", 'Ah! Damn it!', 'They got me!'],
  down: ["I'm down! I need help!", 'Help me up!', "Over here! I can't get up!"],
  up: ['Thanks. I owe you one.', "I'm good. Let's go.", 'Thought I was done for.'],
  behind: ['Behind you!', 'On your six!', 'Watch your back!'],
  clear: ['Clear.', "That's the last of them.", 'Quiet. For now.', "We're still breathing.", 'Is that all you got?'],
  idle: [
    'Hell of a night.',
    "Anybody else's ears ringing?",
    'Stay sharp.',
    "I'm with you, all the way.",
    "Sun's coming up. Finally.",
    "I'd kill for a coffee.",
    'My feet are killing me.',
    'Remind me why we stayed?',
    "When this is over, I'm sleeping for a week.",
  ],
  car: ["Car's gonna blow!", 'Get clear of that car!'],
  hear: ['You hear that?', "Something big's coming.", 'Here we go again.'],
  horde: [
    'Oh, shit.',
    'Oh no. No, no, no.',
    "That's... a lot of them.",
    'Aaaaaaaaaaaaaaah!',
    "We're gonna need more bullets.",
    'Nope. Nope. Nope.',
  ],
  panic: ["Get 'em off me!", 'Too close! Too close!', 'Back off!'],
  boom: ['Ha! Did you see that?', 'Boom!', "Now that's a barbecue."],
  boss: [
    'What the hell is that?',
    "Oh, that's not good.",
    'Nobody said anything about that!',
    'Is it supposed to be that big?',
  ],
  join: ['Right behind you.', "Let's do this.", 'Got your back.'],
  found: ['Found some rounds.', 'Here, take this.'],
  chopper: ["That's our ride!", "Chopper's here! Go, go!"],
};
