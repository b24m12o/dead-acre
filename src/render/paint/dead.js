/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The atlas: the dead, lying where they fell (all face +x)
import { ell, region } from '../atlas.js';
export function paintDead() {
  /* ----- The dead (all face +x) ----- */
  /* superseded: z_torso0, z_torso1, z_torso2 */
  /* superseded: z_head0, z_head1, z_head2 */
  // 3 cop · 4 nurse · 5 firefighter · 6 construction worker
  /* superseded: z_torso3 */
  /* superseded: z_torso4 */
  /* superseded: z_torso5 */
  /* superseded: z_torso6 */
  /* superseded: z_head3 */
  /* superseded: z_head4 */
  /* superseded: z_head5 */
  /* superseded: z_head6 */
  region(
    'wound',
    14,
    10,
    a => {
      a.fillStyle = '#3a0404';
      ell(a, 0, 0, 5.5, 2.6, 0);
      a.fill();
      a.fillStyle = '#b02020';
      ell(a, 0, 0, 4, 1.4, 0);
      a.fill();
      a.fillStyle = '#e8b0a0';
      ell(a, -1, -0.4, 1.6, 0.6, 0);
      a.fill();
    },
    0.9,
    1,
    0.6
  );
  /* superseded: z_head_spit */
  /* superseded: z_torso_spit */
  /* superseded: z_hand */
  /* superseded: z_foot */
  /* superseded: z_bloat */
  /* superseded: z_brute */
  /* superseded: z_bhead */
  /* superseded: z_scream */
  /* superseded: z_shead */
}
