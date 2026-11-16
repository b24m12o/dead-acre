/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// What your backups say out loud, and in which voices. tools/voices/barks.py reads this file and records every line
// in every voice into the voice bundle, so a line here must match its recording word for word: change one, run the
// tool again. Each survivor gets one of the two voices that fit their name and keeps it.
export const BARK_VOICES = { M: ['am_fenrir', 'am_puck'], F: ['af_bella', 'af_sarah'] };
// your people's own threads (threads.js): what each asks at their own place, says coming back, says if you keep them,
// and what the others say the morning after one of you is lost. Never a name: the same clip for whoever says it
export const THREAD_LINES = {
  medic: {
    ask: "I worked here, on the second floor. The supply room still has what we need. Let me go tonight. I'll be back by dawn.",
    back: "Told you I'd be back. Everything they had upstairs.",
  },
  scav: {
    ask: "I hid a bag in the freezer here, back before it all went bad. Give me tonight and I'll bring it back.",
    back: 'Still there, every bit of it. Told you.',
  },
  cop: {
    ask: 'The county impound lot is up the quarry road. Everything we ever took off people is in there. Let me go tonight.',
    back: "Got the gate open. You're going to like this.",
  },
  marksman: {
    ask: 'I hunted these woods along the river for years. My old blind still has my gear in it. Give me tonight.',
    back: "Got my old rifle back. Now we're talking.",
  },
  stay: ['Okay. We stick together.', "Your call. I'm with you.", 'Fine. Another time, maybe.'],
  mourn: [
    "They'd want us to keep moving.",
    'I keep looking for them out there.',
    'We should have stayed closer. All of us.',
  ],
};
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
