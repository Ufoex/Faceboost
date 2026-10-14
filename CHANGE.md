## Faceboost (Ufoex fork, formerly Materialbook) - v1.2.0

<ins>**Changelog:**</ins>

* Feature: Merged the improvements of the AstryxBook, dh6k, BraveBook and LiteBook forks (see FORK_CHANGES.md).
* Feature: Auto-scroll reels (setting): goes to the next reel when the current one ends; a button in the reel viewer pauses it.
* Feature: Reel audio with the screen off (setting, off by default): adds an audio button to the reel viewer that keeps the reel playing when the screen turns off.
* Feature: Check for updates on start (setting, on by default) and a Check now button in Settings; the dialog downloads the new APK and opens the system installer (Android asks once to allow installing from Faceboost).
* Fix: Reels no longer jump to another reel when Facebook rebuilds the list; the thumbnail fades out only when a video starts, not when it resumes.
* Fix: The text typed in the post box (groups and others) is visible in Facebook's dark mode instead of black on black.
* Feature: The app opens more Facebook links: web/mobile/touch/mbasic.facebook.com, fb.com, fb.me and the Facebook app's fb:// and facebook:// links (profile, page, group, event, reel, marketplace...).
* Feature: App renamed to Faceboost with a new icon (the applicationId stays `com.ufoex.materialbook`, so updates keep replacing the installed app).
* Feature: Long-press the app icon for shortcuts: Messages, Search, Marketplace, Reels and Notifications. A link opened from outside (a shortcut) now closes the Messages layer and loads again even if it is the same link twice.
* Feature: Notifications permission is asked the first time the app opens (Android 13+), with a Notifications row in Settings that shows the state and opens the system notification settings.
* Feature: Hide navigation bar (setting): hides the on-screen buttons or the gesture line, keeping the status bar; swipe from the bottom edge to show it.
* Feature: Settings translated to every language of the app (Arabic, Bengali, German, Spanish, French, Italian, Hebrew, Polish, Portuguese, Traditional Chinese).
* Fix: Fullscreen video rotates by the sensor even when the system auto-rotate is off, instead of going back to portrait.
* Feature: The update dialog shows the release notes (headings, bullets, bold) in a card and a progress bar while it downloads.
* Feature: After Android closes the app in the background, it comes back to the page you were on instead of the Facebook home.
* Feature: Keep the app in memory (Settings): opens the battery-optimization exemption so Android is less likely to close the app in the background.
* Feature: Share to the app: links, text, pictures and videos from other apps. A dialog offers Messages (in this app, typed into the chat you pick), the Messenger app, or posting the link on Facebook. Facebook's "Send as message" uses it too instead of jumping to the Messenger app. Your latest chats are also offered as contacts in Android's share sheet (not shown by every system share menu).
* Feature: Facebook notifications (setting, off by default): about every 15 minutes, even with the app closed, it checks the counts on Facebook's tab bar and notifies of new messages, notifications and friend requests.
* Fix: Facebook resets the page to its Home after the app has been in the background for a few minutes (its connection is lost when Android freezes the page); the app now takes you back to the page you were on.
* Tweak: Messenger settings: "Messages in desktop mode" became **Use an external Messenger app** (off by default = Messages opens inside the app). Turning it on shows a Messenger app row with a list of the installed compatible apps (instead of typing a package name).
* Tweak: Sharing to the app no longer asks where to send: it goes to the in-app Messages (you pick the chat) or, with the external option on, straight to the chosen Messenger app. The "Post on Facebook" choice was removed.
* Tweak: The repository is now Ufoex/Faceboost; the app checks it for updates and scripts, and the APK of each release is named Faceboost-<version>.apk. Signing keys (*.jks) are git-ignored.
* Feature: Reel gestures (setting, under Reel controls): hold the video to play it faster (1.5x to 4x) instead of Facebook's copy-link, and double tap the left or right side to go back or forward 5, 10, 15 or 30 seconds, with a small overlay showing it.
* Feature: Resize videos (setting, under Reel controls, off by default): shows the whole video without cropping, with a button in the reel viewer to switch it off temporarily.
* Feature: The reel viewer buttons show the option you just toggled in the middle of the screen (hide icons, fit, auto-scroll, audio) and bounce when pressed.
* Tweak: Hiding the reel icons fades them out and slides the reels over the top bar instead of cutting; showing them again fades them back without moving the layout.
* Fix: The fullscreen button of the extra seek bar now lets you rotate the phone (it asks for fullscreen on the video's container like Facebook's own button).
* Fix: The reel interface no longer flashes back while the icons are hidden.
* Feature: Open web links in a Custom Tab (setting, off by default): links to other sites open in your browser's tab over the app, with the browser's own login instead of Facebook's.
* Feature: Keep screen on (setting): off, while a video plays, or always while the app is open.
* Feature: Export and import settings as a small JSON file through the system file picker.
* Feature: Text size (setting, 85% to 150%) for the feed and the Messages layer, applied right away.
* Feature: The Messages layer follows the phone's rotation (chat list beside the conversation in landscape), and videos in it can use Picture-in-Picture.
* Tweak: Security hardening: backups no longer carry the Facebook session, third-party cookies are off in the Messages layer, the WebView pins file access, Safe Browsing and geolocation, and downloads only accept photos and videos from Facebook pages and Facebook's hosts.
* Tweak: Links that leave the app: web, email and phone open directly, other apps' links ask first, javascript:/file:/content:/data: are refused and intent:// links only follow their web fallback. Links sent to the app must be Facebook pages. Tracking parameters (fbclid, utm_*, __tn__, mibextid...) are removed without touching ref, set or source.
* Feature: Messenger voice and video calls in the Messages layer. The app asks for the camera and microphone when a call starts (only Facebook's own pages can use them) and, if you said no, a window sends you to the app's settings to turn them on.
* Feature: Back on the feed sends the app to the background instead of closing it, so coming back keeps the page.
* Feature: Settings rows to allow opening Facebook links in this app (Android 12+), share the page you are on as a clean link, and log out of Facebook on this phone.
* Feature: App lock (Settings, off by default): asks for your fingerprint, face or phone PIN when the app opens and after more than 15 seconds in the background.
* Feature: The Messages layer has a close button where the Facebook logo was, styled like the header's other buttons (it follows the light, dark and OLED themes). Closing it, or going home from the layer, no longer reloads the feed.
* Feature: Turning the app lock on first asks for your fingerprint, face or PIN to confirm it is you.
* Feature: "Share via..." row in Facebook's share sheet, under Copy link: it copies the post's link and hands it to Android's share sheet.
* Feature: Use only built-in scripts (Settings, off by default): never downloads page scripts, only the copies inside the app run.
* Tweak: Releases are now numbered 1.2.x.
* Feature: A Settings gear in the reel viewer, and the gear in the Messages layer header now opens Settings.
* Tweak: Saved downloads are named Facebook_<date>_<time>.
* Tweak: The page can only reach the app's Settings, theme, video state, clipboard, reel audio and Messages calls from the main frame of Facebook or Messenger, not from ads or embeds.
* Tweak: LICENSE updated from upstream.
* Tweak: Settings dialog status bar icons follow its background.
* Tweak: New applicationId `com.ufoex.materialbook`; runtime scripts are fetched from this repo.

---

## Materialbook - v1.0.0

<ins>**Changelog:**</ins>

* Feature: Add 'Material You' setting that themes Facebook's blues using your MY colors.
* Feature: Hide more login screen distractions.
* Tweak: Settings are now a full page, with visual sections of settings. (upstream)
* Tweak: Settings use Material You fallback colors on Android 10 or below.
* Tweak: Change the button at the bottom of settings to a 'Support my work! ☕' button.
* Tweak: Change settings gear's icon and color.
* Tweak: Change default settings.
* Tweak: Make loading bar's background transparent.
* Tweak: Increase settings header vertical padding
* Tweak: Make settings header use default background color
* Fix: Navigation bar's color follows the settings' background color when inside settings.
* Fix: Improve AMOLED Black.
* Non-app related: Improved the README.

> [!NOTE]
> I'm sorry this update has taken multiple months.
>
> The Material You script was not good enough to publish by my standards
> (even when it did get the job done), so as I got better I did a full rewrite
> and made it 4x shorter and increased the coverage.

> [!TIP]
> Did you find a place that isn't AMOLED Black or Material You? Comment
> in [this discussion](https://github.com/eepiemi/Materialbook/discussions/1).
>
> Or maybe you're dissatisfied with the lack of translations for some elements? Help
> me get everything translated by commenting in
> [this discussion](https://github.com/eepiemi/Materialbook/discussions/2).
> Any help with the large amount of gaps that are present will be HIGHLY APPRECIATED!!
>
> Or you just have an issue? File an issue [here](https://github.com/eepiemi/Materialbook/issues/new/choose).
> I can't guarantee I'll be able to fix it with my current Kotlin + Jetpack Compose skills though 😅

I REALLY hope you enjoy what has become the biggest project of my life! 🥹* Fix: Holding the video no longer leaves the "2x" speed on when you swipe back with the system gesture: touches that start at a screen edge are ignored, and the speed is restored if the touch is cancelled or the reel is left.
* Tweak: The debug build is named "Faceboost Debug" in every language.
* Tweak: Page scripts are never downloaded any more: the app always runs the copies bundled inside it, so a script change reaches you with the app update. The "Use only built-in scripts" setting is gone.
* Tweak: The settings gear is removed from the reel and video viewer (Settings stays in the top bar), and the hide-icons (eye) button is now the last one in the column of reel buttons.
* Feature: The update dialog shows the release notes in Spanish or English (other languages get English), from the language blocks of the GitHub release.
* Feature: Move the reel buttons: hold one to enter edit mode (the buttons wiggle, a grid and Save/Cancel appear), drag it to another cell of the grid (it snaps to the cell, and swaps with the button that was there) and Save to keep the layout.
