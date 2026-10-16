# ROADSTER: Flight Mode

A fan-made browser stunt game based on the **Tesla Roadster unveiling (Oct 16, 2026)**. It's one dependency-free HTML5 Canvas game (`index.html` + `game.js` + `style.css`, about 45 KB). It plays at 60 fps on desktop and phones.

**Play:** https://xfreeze2.github.io/roadster-flight-mode/

> *"Turns out the future does have flying cars."*

## Trims = levels
| # | Trim | Tagline | What you do |
|---|------|---------|-------------|
| 01 | **Performance** | Road ready | Drift for points (smoke!). Hold **Suction** to ride neon loops upside down using the fan + ground-sealing suction system ("enough suction to hold the vehicle upside down"). The telemetry HUD reads DOWNFORCE kg / PITCH deg / ALTITUDE ft. |
| 02 | **Thrust** | Race ready | 0–60 in under 1 second. Fire the cold-gas thrusters to jump the Tesla Semis and land a **kickflip** ("Tony Hawk would be proud"). You can also land on the trailer roof. |
| 03 | **Rocket** | Air ready | Full flight system. Take off over a traffic jam, then fly with up-thrust, rotation and boost through rings. Gas pressure drains while you thrust and recharges when you don't. Land past the finish to see the end card. |

## Controls
| Action | Keyboard | Touch |
|---|---|---|
| Accelerate / brake | → / ← (D / A) | ▶ / ◀ |
| Thrusters up (jump / fly) | ↑ / W | THRUST |
| Rotate (pitch) in the air | Q / E | ⟲ / ⟳ |
| Action: Suction (L1) · Kickflip (L2) · Boost (L3) | Space | red button |
| Drift (L1–2) | Shift / ↓ / S | DRIFT |
| Boost (forward thrusters) | B | BOOST (L3) |
| Pause | P / Esc | II |

In the air, a full rotation scores a backflip or frontflip bonus. Land on your wheels; if you touch down mid-kickflip, you crash.

## Car
The car is drawn entirely in Canvas vector shapes: a low wedge two-seater in silver/Ano White, a gold-glazed canopy, hidden slit headlights, the full red rear light bar, thin-spoke wheels, and gull-wing doors (open on the title screen). Sound is generated with WebAudio, and there are no image or audio assets.

## Mechanics reference (tesla.com/roadster)
Multi-mode fan and ground-sealing suction, active wings, Track Mode, perimeter cold-gas thrusters for forward, upward and rotational movement ("So yes, it can fly"), and a steer-by-wire yoke. Trims: Performance, Thrust and Rocket.

## Run locally
Open `index.html` in a browser, or run `python3 -m http.server`. For testing, `?level=0|1|2&demo&ff=SECONDS` skips to a level with autopilot.

*Unofficial fan project. Not affiliated with Tesla, Inc.*
