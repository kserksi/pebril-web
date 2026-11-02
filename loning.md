# Pebril — Prelude and Loading Animation Specification

| Document property | Content |
|---|---|
| Document number | PEB-DES-MOTION-001 |
| Version | v0.2 |
| Last updated | 24 October 2026 |
| Module | Prelude · brand prologue |
| Design baseline | 1920 × 1080 / 16:9 |
| Status | Design baseline, to be verified in prototype |
| Scope | Pre-release site: first load, brand entrance, scroll exit |
| Related document | Pebril Pre-release Website Design White Paper v0.2 |

---

## 01. Design goals

### 1.1 Where this module sits

Prelude is the brand prologue that precedes the album title page on the Pebril website, and it also serves as the resource-loading transition.

Its core goals:

1. Keep people from seeing a page with missing elements or unfinished layout while first-screen resources are still arriving.
2. Turn real loading progress into ripples on the concentric rings, so waiting has visible feedback.
3. Build the brand impression through short, continuous animation.
4. Once the state is stable, keep the page alive with a slight breathing motion and a response to input.
5. Turn the concentric circles into a single line, preparing the timeline in the second screen, 时间漫游 (Time Roaming).
6. Make every animation join naturally into the user's scrolling.

### 1.2 Core design idea

**Quietly Present. — present, quietly, in the right measure.**

Prelude is not meant to be a show.

The module follows these principles:

- Quiet without being dull.
- Alive without being busy.
- Continuous, natural motion, without an obvious mechanical feel.
- Loading feedback must rest on real technical state.
- Self-running animation must not get in the way of what the user does.
- Visual states stay continuous with one another.
- A failed load must never block the way into the site.

### 1.3 Design narrative

**Emerge → ripples settle → brand alternation → calm breathing → rings unfold → gathered into a line → brand settles.**

"Ripples settle" reflects resource loading; "calm breathing" is the stable state after loading finishes.

They mean different things to the user and must never be treated as one animation.

---

## 02. Static visual specification

### 2.1 Canvas and composition

The desktop layout follows the PPT prototype supplied by the owner.

It uses a central-axis composition.

The main elements are:

- A warm white background.
- Three concentric circles sharing one centre.
- The brand text at the centre.
- No extra decorative elements.

The first-screen photo river and the timeline control are not part of the Prelude's initial state.

### 2.2 Concentric circles

The three rings are named:

- Ring I — inner ring
- Ring II — middle ring
- Ring III — outer ring

All three share the same centre.

Following the PPT composition, the initial radii are roughly:

**inner : middle : outer = 0.56 : 0.78 : 1**

The exact ratio is to be confirmed in the prototype.

Rings are drawn with a thin stroke, never a solid fill.

During loading the outline may waver slightly, but the concentric structure must remain.

### 2.3 Brand text

The centre holds two independent text layers:

**Pebril**

**溪石** (Xishi, “creek stone”)

Both follow the existing brand rules:

| Element | Typeface |
|---|---|
| Pebril | Manrope |
| 溪石 | LXGW WenKai |

The two layers share a visual centre; they do not need the same width.

### 2.4 Colour

| Element | Reference |
|---|---|
| Background | `#F8F7F3` |
| Brand text | `#59666C` |
| Rings | low-contrast neutral grey |
| Supporting accent | `#526B79` |

---

## 03. Animation lifecycle

Prelude has four main states.

| State | Animation | Enters when |
|---|---|---|
| Loading | P0 + Loading Ripple | Minimum start-up resources are ready; first-screen resources keep loading |
| Entering | P1 | All critical first-screen resources are ready and the ripples have settled |
| Idle | P2 + P3 | P1 has finished |
| Exiting | P4 + P5 | The user scrolls down |

### 3.1 Sequence

1. The browser opens the Pebril site.
2. Minimum start-up resources are ready.
3. P0 plays; the rings and Pebril emerge.
4. Other critical first-screen resources keep loading; the ripple strength reflects progress.
5. As progress rises, the ripples settle.
6. Critical first-screen resources are ready; P1 begins.
7. Pebril fades out and 溪石 fades in.
8. P2 and P3 hold the stable state.
9. The user scrolls down, triggering P4 and P5.
10. The rings gather into a single line and leave; Pebril moves to the centre of the navigation bar.
11. The album title page becomes the dominant view.

### 3.2 State management principles

Every state must have a clear condition for entering and for leaving.

P0's appearance animation and the loading ripple may overlap in part.

P2 and P3 run in parallel.

P4 and P5 share a single scroll progress.

No state change may jump.

---

## 04. Loading Ripple — loading progress ripples

**New module**

This module defines the relationship between resource loading progress and the visual waver of the rings.

### 4.1 Core definition

The less that has loaded, the more visible the ripple.

As resources arrive, the amplitude keeps falling.

When the critical first-screen resources are ready, the ripple settles completely and the three rings return to regular, calm circles.

**The further loading has gone, the closer the ripple is to stillness.**

That is the core rule of the Loading Ripple.

### 4.2 How the ripple shows

While loading, the radii are not entirely fixed.

The outline may carry a gentle, continuously travelling waver of limited amplitude:

- The rings keep their overall circular structure.
- The outline may move faintly along the radius.
- The waver travels smoothly, with no sharp corners.
- There is no visible swirl, shatter, or strong distortion.
- The three rings keep their basic ordering.

The ripple should feel closer to a small disturbance on water than to an abstract audio spectrum.

### 4.3 Progress and strength

Definitions:

- `P`: share of critical first-screen resources loaded, 0–1.
- `Amax`: the maximum allowed ripple amplitude.
- `A(P)`: the current target amplitude.

The first round uses a non-linear falloff:

**A(P) = Amax × (1 − P)^1.35**

The formula is a first experiment only.

The intent:

Early on, the ripple is moderately visible.

As progress rises, it weakens.

Near completion it is nearly still.

At completion the amplitude is zero.

### 4.4 Reference strength

| Progress | Relative ripple strength |
|---|---|
| 0% | 100% |
| 10% | about 87% |
| 25% | about 67% |
| 50% | about 39% |
| 75% | about 15% |
| 90% | about 4% |
| 100% | 0% |

These are fractions of `Amax`, not percentages of the radius.

The real maximum amplitude is to be verified in the prototype.

### 4.5 Smoothing progress

Real progress arrives unevenly:

- Several photographs finish loading at once.
- A font file arrives late.
- An initialisation task completes abruptly.

None of these events may be turned straight into a sudden deformation.

The system separates:

**actual progress**

**visual progress**

Visual progress follows actual progress smoothly, so amplitude never jumps.

Visual progress must never run ahead of what has actually been confirmed.

At 100%, the rings ease back into regular circles rather than stopping dead.

### 4.6 Ripple and ring colour

During loading, the change should be carried by geometric waver.

Ring colour stays broadly stable.

If any colour change is used, it may only be a very slight change in opacity.

Colour flicker must not become the main signal of loading.

### 4.7 The end of loading

When all critical first-screen resources are ready:

1. Actual progress reaches 100%.
2. The amplitude eases to zero.
3. The three rings return to complete concentric circles.
4. P1, the brand text alternation, begins.

A very short, natural visual transition between the settling and P1 is desirable.

No waiting time is added merely to show more animation.

---

## 05. P0 — initial appearance

### 5.1 When it runs

The minimum start-up resources are ready.

These are:

- The Prelude's base HTML and CSS.
- The rings' SVG or equivalent rendering resources.
- The minimal animation control logic.
- A typeface able to show the brand name, or a reliable fallback.

P0 does not wait for every first-screen photograph.

### 5.2 What it does

The three rings and Pebril emerge in place.

Opacity rises from 0 toward normal.

There is no visible movement, rotation, or scaling.

### 5.3 Timing

**About 1 second.**

### 5.4 Relationship to the loading ripple

P0 may overlap with loading.

As its opacity rises, people see the ripple that matches the current progress.

The ripple's amplitude comes from resource progress, not from P0's playback time.

### 5.5 When loading is fast

If the critical resources are ready before Prelude appears, the page may show calm rings and go straight to the brand alternation.

Progress must never be slowed, or waiting added, just to show the ripples.

---

## 06. P1 — brand alternation

### 6.1 When it runs

All of the following hold:

- P0 has finished or ended safely.
- The critical first-screen resources are ready.
- The loading ripple has settled.

### 6.2 What it does

The centre text changes from Pebril to 溪石.

Pebril begins to fade out.

溪石 begins to fade in at the same time.

The two fades overlap in time.

### 6.3 Timing

**About 1 second.**

### 6.4 End state

- Pebril is fully hidden.
- 溪石 is fully visible.
- The three rings stay complete.
- The system enters Idle.

### 6.5 Constraints

Both text layers keep a stable centre.

The text must not be swapped abruptly, and no layout shift may appear.

---

## 07. P2 — ripple interaction

### 7.1 When it runs

P1 has finished and the system is Idle.

### 7.2 What it does

The rings answer user input with a slight ripple.

Input may include:

- Pointer approaching or moving.
- Pointer click.
- Touch.

The exact triggers and hit areas are decided during prototyping.

### 7.3 Difference from the loading ripple

The loading ripple's amplitude comes from resource progress.

P2's ripple comes from user input.

**Loading ripples and interaction ripples are two separate logical modules.**

P2 must not keep reading loading progress as its source.

### 7.4 Constraints

Feedback from input decays quickly and gently.

Amplitude must not accumulate without limit.

Feedback must not disturb the scroll exit that follows.

The design language follows the small-disturbance principle in the white paper's Phase 5 · Quiet Closure.

---

## 08. P3 — breathing rings

### 8.1 When it runs

Together with P2, in the stable state.

### 8.2 What it does

The three regular rings expand and contract slowly.

While expanding:

- Radii increase gradually.
- Colour or opacity lightens slightly.

While contracting:

- Radii return gradually.
- Colour or opacity returns to the initial state.

### 8.3 Suggested parameters

| Parameter | First-round suggestion |
|---|---|
| Breathing period | 5–7 s |
| Radius change | about ±1%–2% |
| Easing | soft, continuous across cycles |
| Phase offset | small or none, to be verified |
| Loop | continuous, without a seam |

### 8.4 Difference from the loading state

The loading ripple is an irregular outline disturbance that fades away.

P3 is a slow, regular change of the whole radius.

They must never look like the same animation.

### 8.5 Relationship to interaction ripples

P2 may add a small disturbance on top of P3.

Deliberate input takes precedence over the autonomous breathing.

On entering P4, both P2 and P3 give way smoothly.

---

## 09. P4 — circle to line

### 9.1 When it runs

The user scrolls down deliberately.

Animation progress follows the scroll position.

### 9.2 Core definition

**The three rings break at the top in turn, from outermost to innermost, unfold along continuous paths, and gather into one horizontal line.**

The result is not three parallel lines.

Nor do the three circles vanish and new lines appear afterwards.

### 9.3 Breakdown

**Step A — break at the top**

The outer ring breaks first.

The middle ring follows.

The inner ring breaks last.

The three may overlap slightly in time.

**Step B — unfold**

The broken rings unfold along continuous curves.

The transformation stays perceptible.

The shape is never swapped in an instant.

**Step C — gather into one**

The unfolded rings approach a shared horizontal baseline.

They end as one complete horizontal line.

Visual continuity holds throughout: nothing vanishes abruptly, no doubled lines flicker.

**Step D — the line leaves**

The single horizontal line travels downward.

Opacity falls as it moves.

It finally leaves the main visual area.

### 9.4 Relationship to the timeline

The line created here is the visual foreshadowing of the timeline on the second screen, 时间漫游.

Prelude's line stands for the change from ripple to order.

The timeline that reappears on the second screen carries real ticks and interaction.

They are continuous in design language, but one graphic element need not span every scene.

### 9.5 Technical direction

SVG path morphing, or another method with exact control over curves, is recommended.

GSAP can manage scroll progress, opacity, position, and state changes.

The unfolding algorithm needs its own technical prototype.

---

## 10. P5 — brand transition

### 10.1 When it runs

Together with P4.

It shares the same scroll progress.

### 10.2 What it does

The centre text 溪石 hides gradually.

Pebril reappears and moves to the centre of the navigation bar.

### 10.3 End state

- 溪石 is fully hidden.
- Pebril sits at the centre of the top navigation bar.
- The rings have gathered and left.
- The album title page is the dominant view.

### 10.4 Constraints

The brand text moves continuously.

Its size may be adjusted smoothly to suit the navigation bar.

No text node may be swapped in a way that makes the layout jump.

P4 and P5 share one scroll control.

---

## 11. Scroll behaviour

### 11.1 Basics

P4 and P5 follow scroll progress.

When scrolling stops, the frame holds its state.

Scrolling back up restores the earlier state.

### 11.2 Restoration

P4 in reverse:

The horizontal line unfolds back into arcs, then into three complete circles.

P5 in reverse:

Pebril returns from the navigation bar toward the centre and fades out, while 溪石 reappears.

The system returns to Idle.

### 11.3 Scrolling while loading

The loading ripple has to stay visible during loading, so scrolling must not let people into pages that are not ready.

During Loading, P4 and P5 should not be triggered, but scrolling must not be locked for good.

Once the critical resources are ready and the brand entrance has finished, normal scroll control resumes.

The exact handling of early scroll input is still to be verified in the prototype.

### 11.4 Input methods

These must all work:

- Mouse wheel.
- Trackpad.
- Touch scrolling.
- Keyboard scrolling.

Navigation must never depend on hover alone.

---

## 12. Resource loading and technical rules

### 12.1 Resource tiers

**Bootstrap**

Shows the Prelude's basic composition and loading feedback as early as possible.

**Critical**

The fonts, photographs, layout, and key animation initialisation the first screen needs.

Their readiness decides when the loading ripple completes.

**Deferred**

Later collections, the Journal, and anything not on the first screen.

They must not hold the Prelude back from completing.

### 12.2 Calculating progress

The browser offers no natural, site-wide loading percentage.

So an explicit list of critical tasks is required.

Progress is computed from tasks actually completed.

Weights by resource type are allowed, provided they match the real work.

A fixed timer must never invent a percentage.

### 12.3 Constraints on progress

- Actual progress never goes backwards.
- Visual progress follows it smoothly.
- 100% means every listed critical task has completed or degraded safely.
- A failed load must not stall progress forever.
- A slow non-critical resource must not extend the wait.

### 12.4 Fast loads and cache

When resources are cached and the first screen is ready at once, the visible loading ripple may be skipped.

No waiting is added merely to play the animation.

### 12.5 Failure

If a critical photograph fails, an available substitute or a degraded composition may be used.

If the brand typeface fails, the fallback takes over.

If the animation system fails to initialise, the page must fall back to an accessible static first screen.

A script error inside Prelude must never leave someone waiting forever.

### 12.6 Minimal dependencies

The start-up screen should depend on as few external resources as possible.

Drawing the rings and controlling the basic state must not wait for the whole site script.

---

## 13. Responsive behaviour and accessibility

### 13.1 Desktop

The 1920 × 1080 PPT composition is the main baseline.

Keep the ring centre, the brand text, and the whitespace in proportion.

### 13.2 Mobile

Ring size and composition may be reworked.

Whether rings may extend past the screen edge needs separate verification.

Unintended horizontal scrolling is never acceptable.

### 13.3 Reduced motion

With `prefers-reduced-motion`:

- The continuous breathing is disabled or much weaker.
- Interaction ripples are disabled.
- A simplified loading state is used.
- Complex path morphing is simplified.
- Normal navigation still works.

### 13.4 Accessibility

The brand text keeps its real text semantics.

The rings are decorative and add no repeated information for screen readers.

Loading state is available as accessible text; progress must not rest on the shape of the rings alone.

---

## 14. Technical implementation recommendations

### 14.1 Technology Candidates

- HTML / CSS: page structure and text.
- SVG: concentric circles and curved forms.
- JavaScript: progress accounting for critical resources.
- GSAP: animation timeline.
- ScrollTrigger: scroll control.

The specific animation libraries and implementation details are determined during the technical verification phase.

### 14.2 Module Breakdown

Prelude is proposed to be split into the following logical units:

| Module | Responsibility |
|---|---|
| Resource Loader | First-screen critical resource preparation and progress calculation |
| Loading Ripple | Mapping from loading progress to ripple amplitude |
| Prelude State | Animation state management |
| Ring Renderer | Concentric circles and geometric forms |
| Brand Transition | Alternation and settling of Pebril / 溪石 (Creek Stone) |
| Interaction Controller | Mouse and touch feedback |
| Scroll Controller | Exit and reverse scrolling |

### 14.3 Animation Control Principles

Loading ripples, interaction ripples, and the breathing effect may share the ring rendering system, but their state sources must be distinguished.

Multiple independent animations must not compete to control the same geometric property at the same time.

After P4 begins, the scroll timeline should take over the ring's primary geometric state.

### 14.4 Performance Requirements

Sustained ripples and breathing should keep drawing cost under control.

Avoiding frequent layout recalculation takes priority.

Animation performance must be verified on real desktop and mobile devices.

---

## 15. Prototyping and acceptance

### Milestone A — Loading and Entry

**Scope: P0, Loading Ripple, P1**

- [ ] The initial composition matches the PPT.
- [ ] P0 concentric circles and Pebril emerge smoothly.
- [ ] A moderate ripple appears while resources load.
- [ ] Ripple amplitude correlates with actual resource loading progress.
- [ ] As progress increases, the fluctuation steadily weakens overall.
- [ ] Progress updates do not cause abrupt jumps.
- [ ] When resource loading completes, the concentric circles return to calm.
- [ ] P1 triggers correctly after loading completes.
- [ ] Pebril and 溪石 alternate smoothly.
- [ ] Fast loading does not produce unnecessary waiting.
- [ ] The page degrades safely when loading fails.

### Milestone B — Stable State

**Scope: P2, P3**

- [ ] User input produces soft ripple feedback.
- [ ] The breathing motion is steady and natural.
- [ ] The breathing amplitude does not disrupt the overall composition.
- [ ] Ripple interaction and autonomous breathing run in coordination.
- [ ] There are no visible animation loop resets.
- [ ] Input feedback does not produce excessive oscillation.

### Milestone C — Exit and Scene Transition

**Scope: P4, P5**

- [ ] The rings break in the order outer, middle, inner.
- [ ] The rings' unfolding paths are continuous.
- [ ] The three rings finally form a single horizontal straight line.
- [ ] The horizontal line moves downward and gradually fades out.
- [ ] 溪石 gradually hides.
- [ ] Pebril moves smoothly to the center of the navigation bar.
- [ ] P4 and P5 use a unified scroll progress.
- [ ] The frame is stable when the user stops scrolling.
- [ ] Reverse scrolling restores the previous state.
- [ ] The transition into the album cover page is natural.
- [ ] A clear visual foreshadowing is established for the subsequent timeline.

### Milestone D — Full Experience Verification

- [ ] Resources are not visibly missing on first visit.
- [ ] Cached visits enter quickly.
- [ ] Ripple feedback is appropriate on slow networks.
- [ ] No permanent waiting occurs when loading fails.
- [ ] The composition is appropriate on desktop, tablet, and phone.
- [ ] Reduced motion mode works correctly.
- [ ] Fast scrolling and reverse scrolling do not cause state conflicts.
- [ ] The formal first screen is not shown incorrectly before critical resources are ready.

---

## 16. Confirmed decisions and open questions

### 16.1 Confirmed Design Requirements

1. The Prelude precedes the formal album cover page.
2. The initial composition is the central brand text with three concentric circles.
3. P0 is an initial emergence animation of about 1 second.
4. During loading, the concentric circles carry ripples tied to resource loading progress.
5. **The higher the resource loading progress, the closer the ripples come to calm.**
6. P1 triggers after the first-screen critical resources are ready.
7. P1 is a crossfade between Pebril and 溪石 of about 1 second.
8. P2 and P3 are interaction ripples and autonomous breathing in the stable state.
9. P4 and P5 are triggered by the user scrolling down.
10. The three rings break at the top in sequence, from outside to inside.
11. The three rings finally converge into a single horizontal straight line.
12. The line moves downward and gradually fades out.
13. This line provides visual foreshadowing for the subsequent timeline.
14. 溪石 hides during the exit, and Pebril moves to the center of the navigation bar.
15. The scroll exit animation must support reverse restoration.

### 16.2 Items to Be Verified

| Item | Current status |
|---|---|
| Maximum amplitude of the loading ripple | to be verified |
| Nonlinear relationship between loading progress and amplitude | initial approach defined |
| Ripple propagation frequency and direction | to be verified |
| Whether the three rings use different ripple phases | to be verified |
| Task weights for actual resource progress | to be technically tested |
| Response speed of progress smoothing | to be verified |
| Time handoff between P0 and Loading Ripple | to be verified |
| Calm transition before P1 begins | to be verified |
| Specific input feedback rules for P2 | to be verified |
| Breathing amplitude and period for P3 | initial approach defined |
| Ring unfolding geometry algorithm for P4 | to be prototyped independently |
| Path for the three rings to converge into one | to be verified |
| Scroll ranges for P4 and P5 | to be verified |
| Handling of scrolling during loading | to be verified |
| Concentric circle composition on mobile | to be designed |

---

## 17. Closing

Prelude is not merely a waiting animation.

It is the starting point of Pebril's visual narrative.

When the user opens the page, three concentric circles gradually emerge out of the warm-white frame.

At this point resources are still being prepared, and slight ripples run across the rings.

As loading progress continues to rise, the fluctuation gradually subsides and the water surface slowly returns to calm.

When the page is ready, Pebril fades out and 溪石 emerges.

The concentric circles begin to breathe lightly, quietly waiting for the user's next step of exploration.

When the user scrolls down, the three rings break at the top one after another, unfold, and finally converge into a single straight line.

The line gradually moves toward the bottom of the frame and dissipates.

Pebril returns to the navigation bar, and the formal album cover page appears.

And that straight line, once formed by ripples, will reappear as a timeline during the subsequent time roaming.

**Ripple → Calm → Breath → Return to the Line → Time.**

This process expresses Pebril's understanding of the relationship among memory, time, and order.

**Find connection in flow, and keep freedom within order.**

---

*Pebril — Prelude & Loading Animation Specification v0.2*

*This version adds the Loading Ripple module and adjusts the trigger conditions of P0 and P1 and the overall loading lifecycle. The design behavior has been incorporated into the specification; specific animation parameters and technical implementation still require stage-by-stage prototype verification.*
