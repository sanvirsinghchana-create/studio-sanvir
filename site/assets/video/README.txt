VIDEO ASSETS — Sanvir Chana
===========================

The site looks for these five files (posters show if any is missing, so it never breaks):

  hero.mp4                      title montage behind the SANVIR CHANA letters   [DONE — from Videos/Master]
  cash-only.mp4                 Cash Only            (also in the hero montage)  [DONE — from Videos/Cash Only]
  memories-of-tuscany.mp4       Memories of Tuscany  (also in the hero montage)  [DONE — from Videos/Master]
  vehl.mp4                      Vehl                                             [TODO — poster shows until added]
  tale-of-the-snake-charmer.mp4 Tale of the Snake Charmer                        [TODO — poster shows until added]

ENCODING (no ffmpeg on this machine — we use a small Swift/AVFoundation tool):

  ../../tools/encode-web-video  <input>  <output.mp4>  <startSec>  <durationSec>  <maxHeight>

  e.g.  ../../tools/encode-web-video "/Users/sanvirchana/Desktop/My Film.mov" hero.mp4 12 7 1080

  - trims to the chosen window, scales to fit maxHeight (1080 / 720 / 480), keeps orientation
  - strips audio (the site plays everything muted) and front-loads the moov atom (instant streaming)
  - output is H.264 (avc1) MP4 — plays on every modern browser/phone

Guidance: hero ~6-8s 1080p; film panels ~6s 720-1080p. Keep each clip a few MB.
Landscape suits the full-screen hero best; portrait clips suit the (portrait) film panels.

hero.mp4 is currently a BLACK-AND-WHITE PLACEHOLDER (a trimmed reel) so the effect is live —
replace it, and add the four film clips, once the final selections are chosen.
