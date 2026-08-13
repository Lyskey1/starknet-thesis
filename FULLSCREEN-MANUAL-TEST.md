# Manual test: fullscreen across a video switch

Temporary file. Delete it once you have run the check.

Why it exists: `requestFullscreen` needs a real user gesture, so no headless
run can enter fullscreen. That is exactly why the original bug shipped. The
logic around it is covered by automated probes (request target, state sync
across all four bars, slot switching, exit, no residual inline styles), but
the one thing only a human can confirm is what the screen actually shows.

Takes about a minute.

## The check that matters

1. Open https://starknetthesis.io/privacy and scroll to section 03, "The core
   of Starknet's architecture".
2. Click the **SEQUENCER** chip, then press play in the control bar.
3. Click the **fullscreen** button at the far right of the bar.
   - Expect: the video fills the screen, the control bar sits flush along the
     bottom edge of the screen, and the bar's fullscreen button now reads
     Exit fullscreen (hover it to see the tooltip-free label, or tab to it).
4. **Press next in the bar** (the arrow with the bar on its right).
   - This is the regression. Expect: PROVER starts, still fullscreen, still
     filling the screen.
   - The old bug: the screen went empty and showed page content behind.
5. Press next again to reach VERIFICATION.
   - Expect: still fullscreen, and the **next button is now disabled**
     (dimmed, not clickable) because it is the last video.
6. Press prev twice to get back to ARCHITECTURE.
   - Expect: still fullscreen, and the **prev button is now disabled**.
7. Press **Esc**.
   - Expect: you land back on the page exactly as before, the card is its
     normal size, the chip row is visible again, and the chip highlighted
     matches the video you ended on.

## Two smaller things while you are there

- In fullscreen, let a video play and stop touching the mouse. The bar should
  fade out after about two and a half seconds and come back the moment you
  move the pointer.
- In fullscreen, switching video should always start the new one at 0:00,
  paused, showing its poster. The one you left rewinds too.

## If step 4 fails

Report what the screen shows and I will look again. The fullscreen element is
now the grid that holds all four slots (`#pvVideos`), so it should stay valid
through a switch; a failure there means the browser dropped fullscreen for a
different reason, which is worth knowing.
