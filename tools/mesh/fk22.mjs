/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// A fuller skeleton for a figure that plays recorded motion (fig3d.js, src/render/motion.js's FK): from the usual 14
// bones, 22: the spine in three, a neck, the collarbones, the hands off the forearms, the toes off the feet. Its bones
// in the order the recordings keep them; REMAP moves each corner of the mesh from its bone among the 14 to its bone
// among these, by where it lies
const L3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const along = (p, a, b) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]],
    l2 = d[0] * d[0] + d[1] * d[1] + d[2] * d[2];
  return ((p[0] - a[0]) * d[0] + (p[1] - a[1]) * d[1] + (p[2] - a[2]) * d[2]) / l2;
};
const WRIST = 0.74, // along the forearm bone (which runs on to the fingertips)
  BALL = 0.66; // along the foot's (which runs on to the toes)
export function fk22(B, REGION) {
  const [pel, sp, ch, hd, uR, fR, uL, fL, tR, sR, ftR, tL, sL, ftL] = B;
  const c2 = L3(ch[2], ch[3], 0.42), // the top of the lower back
    neck = L3(ch[2], ch[3], 0.9),
    hj = [hd[2][0], hd[2][1], hd[2][2] + 1.2], // the head turns atop the neck
    clav = s => [ch[2][0] + 0.6, s * 1.4, (s > 0 ? uR : uL)[2][2] - 0.2];
  const BONES = [
    ['pelvis', -1, pel[2], pel[3]],
    ['spine1', 0, sp[2], sp[3]],
    ['spine2', 1, ch[2], c2],
    ['chest', 2, c2, neck],
    ['neck', 3, neck, hj],
    ['head', 4, hj, hd[3]],
    ['clavR', 3, clav(1), uR[2]],
    ['uarmR', 6, uR[2], uR[3]],
    ['farmR', 7, fR[2], L3(fR[2], fR[3], WRIST)],
    ['handR', 8, L3(fR[2], fR[3], WRIST), fR[3]],
    ['clavL', 3, clav(-1), uL[2]],
    ['uarmL', 10, uL[2], uL[3]],
    ['farmL', 11, fL[2], L3(fL[2], fL[3], WRIST)],
    ['handL', 12, L3(fL[2], fL[3], WRIST), fL[3]],
    ['thighR', 0, tR[2], tR[3]],
    ['shinR', 14, sR[2], sR[3]],
    ['footR', 15, ftR[2], L3(ftR[2], ftR[3], BALL)],
    ['toeR', 16, L3(ftR[2], ftR[3], BALL), ftR[3]],
    ['thighL', 0, tL[2], tL[3]],
    ['shinL', 18, sL[2], sL[3]],
    ['footL', 19, ftL[2], L3(ftL[2], ftL[3], BALL)],
    ['toeL', 20, L3(ftL[2], ftL[3], BALL), ftL[3]],
  ];
  const REMAP = (p, b, reg) => {
    switch (b) {
      case 0:
        return 0;
      case 1:
        return 1;
      case 2:
        if (reg === REGION.pack) return 3; // the pack rides the upper back
        if (Math.abs(p[1]) > 3.6 && p[2] > uR[2][2] - 3.2) return p[1] > 0 ? 6 : 10; // the tops of the shoulders
        return p[2] < c2[2] ? 2 : 3;
      case 3:
        return reg === REGION.helmet || p[2] >= hj[2] - 0.4 ? 5 : 4;
      case 4:
        return 7;
      case 5:
        return along(p, fR[2], fR[3]) < WRIST ? 8 : 9;
      case 6:
        return 11;
      case 7:
        return along(p, fL[2], fL[3]) < WRIST ? 12 : 13;
      case 8:
        return 14;
      case 9:
        return 15;
      case 10:
        return along(p, ftR[2], ftR[3]) < BALL ? 16 : 17;
      case 11:
        return 18;
      case 12:
        return 19;
      case 13:
        return along(p, ftL[2], ftL[3]) < BALL ? 20 : 21;
    }
    return b;
  };
  return { BONES, REMAP };
}
