# Implementation Plan: Social Media Sharing for Quiz Scores
**Date:** 25/11/2025
**App:** Timalaus
**Feature:** Share quiz scores on social media platforms

---

## 🎯 Objective

Allow users to share their quiz scores (Mode Classique and Mode Précision) on multiple social media platforms with an attractive visual design and smooth UX.

---

## 📱 Target Platforms

1. **TikTok** (Login Kit + Share Kit already configured)
2. **Instagram Stories** (native sharing)
3. **Facebook** (React Native Share)
4. **Twitter/X** (web intent)
5. **WhatsApp** (native sharing)
6. **Generic Share** (native OS share sheet)

---

## 🗂️ Files to Modify/Create

### Files to Create:
1. `components/ShareScoreButton.tsx` - Main share button component
2. `components/ShareOptionsModal.tsx` - Modal with platform selection
3. `utils/shareScore.ts` - Share logic for each platform
4. `utils/generateScoreImage.ts` - Generate shareable image with score
5. `types/sharing.ts` - TypeScript types for sharing
6. `constants/SocialPlatforms.ts` - Platform configuration

### Files to Modify:
1. `components/modals/ScoreboardModal.tsx` - Add share button
2. `app.json` - Add URL schemes for social platforms
3. `package.json` - Add required dependencies

---

## 📦 Dependencies to Install

```bash
pnpm add react-native-share
pnpm add react-native-view-shot
pnpm add @react-native-clipboard/clipboard
pnpm add react-native-fs
```

---

## 🔨 Implementation Steps

### **STEP 1: Create TypeScript Types**
**File:** `types/sharing.ts`

**What to do:**
- Define `SharePlatform` type (tiktok, instagram, facebook, twitter, whatsapp, generic)
- Define `ShareData` interface with score, mode, streak, etc.
- Define `ShareResult` interface for tracking success/failure

**Validation:**
- ✅ Run `npx tsc --noEmit` to check for type errors
- ✅ Screenshot showing no TypeScript errors

---

### **STEP 2: Create Social Platform Constants**
**File:** `constants/SocialPlatforms.ts`

**What to do:**
- Define array of platform objects with:
  - `id`: Platform identifier
  - `name`: Display name
  - `icon`: Icon component/name
  - `color`: Brand color
  - `enabled`: Boolean flag
- Add configuration for each platform

**Validation:**
- ✅ Verify all 6 platforms are defined
- ✅ Screenshot of the file with proper structure
- ✅ Check that colors match brand guidelines (TikTok: #000000, Instagram: #E4405F, Facebook: #1877F2, Twitter: #1DA1F2, WhatsApp: #25D366)

---

### **STEP 3: Generate Score Image Utility**
**File:** `utils/generateScoreImage.ts`

**What to do:**
- Create function `generateScoreImage(scoreData: ShareData): Promise<string>`
- Use `react-native-view-shot` to capture a custom view
- Create a visually appealing score card with:
  - App logo
  - Score/streak information
  - Mode type (Classique/Précision)
  - Decorative elements
  - App branding
- Return base64 or file URI

**Validation:**
- ✅ Generate test image with mock data
- ✅ Screenshot of generated image to verify:
  - All text is readable
  - Logo is visible
  - Colors match app theme (#020817 background, #1D5F9F accent)
  - No cut-off content
- ✅ Test on both light and dark mode
- ✅ Verify image dimensions are social media friendly (1080x1920 for stories, 1200x630 for feeds)

**Logging:**
```typescript
console.log('[SHARE] Generating score image', { mode, score, streak });
console.log('[SHARE] Image generated successfully', { uri, size });
console.error('[SHARE] Failed to generate image', error);
```

---

### **STEP 4: Implement Share Logic**
**File:** `utils/shareScore.ts`

**What to do:**
- Create `shareTo(platform: SharePlatform, data: ShareData): Promise<ShareResult>`
- Implement platform-specific logic:

  **TikTok:**
  - Use TikTok Share Kit API
  - Share image + caption

  **Instagram Stories:**
  - Use `react-native-share` with `InstagramStories.shareToStory()`
  - Include background image and sticker

  **Facebook:**
  - Use `react-native-share` with `Share.shareSingle()`
  - Share image + text

  **Twitter/X:**
  - Use web intent URL: `https://twitter.com/intent/tweet?text=...&url=...`
  - Open in browser

  **WhatsApp:**
  - Use `react-native-share` with `whatsapp` social type

  **Generic:**
  - Use native `Share.share()` from React Native

- Handle errors gracefully for each platform
- Return success/failure result

**Validation:**
- ✅ Test EACH platform individually:
  - TikTok: Screenshot showing share dialog
  - Instagram: Screenshot showing story editor
  - Facebook: Screenshot showing share dialog
  - Twitter: Screenshot showing tweet compose
  - WhatsApp: Screenshot showing chat selection
  - Generic: Screenshot showing OS share sheet
- ✅ Test with no app installed (should show appropriate fallback)
- ✅ Test with airplane mode (should show network error)
- ✅ Verify all links and images are properly formatted

**Logging:**
```typescript
console.log('[SHARE] Starting share flow', { platform, mode, score });
console.log('[SHARE] Share successful', { platform, shareId });
console.log('[SHARE] Share cancelled by user', { platform });
console.error('[SHARE] Share failed', { platform, error, errorCode });
```

---

### **STEP 5: Create Share Options Modal**
**File:** `components/ShareOptionsModal.tsx`

**What to do:**
- Create modal component with:
  - Title: "Partager mon score"
  - Grid of platform buttons (2 columns)
  - Each button shows icon, name, and brand color
  - Close button
  - Smooth animations (fade in, slide up)
- Use `Modal` from React Native or custom modal
- Handle platform selection and trigger share

**UX/UI Requirements:**
- ✅ Modal should slide up from bottom with smooth animation (300ms)
- ✅ Background overlay should be semi-transparent (#000000 at 50% opacity)
- ✅ Platform buttons should have:
  - Minimum touch target: 48x48dp
  - Clear visual feedback on press (scale down to 0.95)
  - Platform brand color as accent
  - Icon size: 32x32dp
  - Rounded corners (12dp)
- ✅ Loading state while image generates
- ✅ Error state with retry option
- ✅ Disabled state for unavailable platforms (greyed out)

**Validation:**
- ✅ Screenshot of modal in open state
- ✅ Screenshot of modal with loading state
- ✅ Screenshot of error state
- ✅ Test modal open/close animation (record video if needed)
- ✅ Test on different screen sizes (small, medium, large)
- ✅ Test in dark mode and light mode
- ✅ Verify all touch targets are at least 48x48dp
- ✅ Test with VoiceOver/TalkBack for accessibility

**Logging:**
```typescript
console.log('[SHARE_MODAL] Modal opened', { from: 'scoreboard' });
console.log('[SHARE_MODAL] Platform selected', { platform });
console.log('[SHARE_MODAL] Modal closed', { shared: boolean });
```

---

### **STEP 6: Create Share Button Component**
**File:** `components/ShareScoreButton.tsx`

**What to do:**
- Create reusable button component
- Props: `scoreData: ShareData`, `onShareComplete?: () => void`
- Button design:
  - Icon: Share icon (arrow coming out of box)
  - Text: "Partager"
  - Style: Matches app design system
- On press: Open ShareOptionsModal
- Handle share completion callback

**UX/UI Requirements:**
- ✅ Button should be visually prominent but not overwhelming
- ✅ Icon should be left-aligned, text right of icon
- ✅ Minimum height: 48dp
- ✅ Rounded corners consistent with app (8-12dp)
- ✅ Hover/press state with color change
- ✅ Success animation after successful share (checkmark, scale pulse)

**Validation:**
- ✅ Screenshot of button in default state
- ✅ Screenshot of button in pressed state
- ✅ Screenshot of success animation
- ✅ Test button in different contexts (modal, screen)
- ✅ Verify button is accessible (proper label, role)

**Logging:**
```typescript
console.log('[SHARE_BUTTON] Button pressed', { context });
console.log('[SHARE_BUTTON] Share completed', { platform, success });
```

---

### **STEP 7: Integrate into ScoreboardModal**
**File:** `components/modals/ScoreboardModal.tsx`

**What to do:**
- Import `ShareScoreButton`
- Add button to modal layout (below score, above close button)
- Prepare `ShareData` from current game state:
  - Score/streak from context
  - Mode from game state
  - Timestamp
  - User stats (if available)
- Test integration

**UX/UI Requirements:**
- ✅ Share button should be clearly visible but not obstruct score
- ✅ Proper spacing (16dp margin from surrounding elements)
- ✅ Should work in both game modes (Classique, Précision)
- ✅ Should be disabled during game (only enabled on score screen)

**Validation:**
- ✅ Screenshot of ScoreboardModal with share button in Mode Classique
- ✅ Screenshot of ScoreboardModal with share button in Mode Précision
- ✅ Test complete flow: Play game → View score → Press share → Select platform → Verify share
- ✅ Verify button position on different screen sizes
- ✅ Test with different score values (0, medium, high scores)

**Logging:**
```typescript
console.log('[SCOREBOARD] Preparing share data', { mode, score, streak });
console.log('[SCOREBOARD] Share button integrated');
```

---

### **STEP 8: Update app.json**
**File:** `app.json`

**What to do:**
- Add URL schemes for deep linking after share
- Add queries schemes for checking installed apps:
  ```json
  "ios": {
    "infoPlist": {
      "LSApplicationQueriesSchemes": [
        "tiktok",
        "instagram",
        "instagram-stories",
        "fb",
        "twitter",
        "whatsapp"
      ]
    }
  }
  ```

**Validation:**
- ✅ Run `npx expo prebuild --clean` (if needed)
- ✅ Verify `ios/kiko/Info.plist` contains LSApplicationQueriesSchemes
- ✅ Screenshot of app.json changes

---

### **STEP 9: Add Analytics Tracking**
**File:** `utils/analytics.ts` (or wherever analytics are)

**What to do:**
- Track share events:
  - `share_initiated` - when user opens share modal
  - `share_completed` - when share succeeds
  - `share_failed` - when share fails
  - `share_cancelled` - when user cancels
- Include metadata: platform, mode, score

**Validation:**
- ✅ Perform test shares and verify events in analytics dashboard
- ✅ Screenshot of analytics showing share events

**Logging:**
```typescript
console.log('[ANALYTICS] Share event tracked', { event, platform, properties });
```

---

### **STEP 10: Remove Old Logs**

**What to do:**
- Search entire codebase for `console.log`, `console.warn`, `console.error`
- Remove ALL existing logs that are not related to:
  - Share functionality
  - Critical errors that must be logged
- Keep only production-safe logging

**Validation:**
- ✅ Run global search: `grep -r "console\\.log" --include="*.ts" --include="*.tsx"`
- ✅ Screenshot of search results showing only share-related logs remain
- ✅ Build app and verify console is clean during normal operation

---

### **STEP 11: End-to-End Testing**

**Test Cases:**

1. **Happy Path - TikTok**
   - Play game in Mode Classique
   - Achieve a score
   - Open share modal
   - Select TikTok
   - Verify TikTok app opens with correct content
   - Complete share
   - Return to app
   - ✅ Screenshot at each step

2. **Happy Path - Instagram Stories**
   - Play game in Mode Précision
   - Achieve a score
   - Open share modal
   - Select Instagram
   - Verify Instagram Stories editor opens
   - Complete share
   - ✅ Screenshot at each step

3. **Error Handling - No App Installed**
   - Uninstall TikTok
   - Try to share to TikTok
   - Verify graceful error message
   - ✅ Screenshot of error message

4. **Error Handling - Network Error**
   - Enable airplane mode
   - Try to share
   - Verify network error handling
   - ✅ Screenshot of error state

5. **Edge Case - Very High Score**
   - Test with score in millions
   - Verify text doesn't overflow
   - ✅ Screenshot

6. **Edge Case - Score of 0**
   - Test with 0 score
   - Verify proper messaging
   - ✅ Screenshot

7. **Accessibility**
   - Enable VoiceOver (iOS) or TalkBack (Android)
   - Navigate to share button
   - Verify proper announcement
   - Complete share flow with screen reader
   - ✅ Video recording of flow

8. **Performance**
   - Measure time to generate image (should be < 1 second)
   - Measure time to open share modal (should be < 300ms)
   - Verify no frame drops during animations
   - ✅ Screenshot of performance metrics

**Validation:**
- ✅ Complete ALL test cases
- ✅ Document results with screenshots for each
- ✅ Fix any issues found
- ✅ Re-test after fixes

---

## 🎨 UX/UI Design Guidelines

### Visual Design:
- **Color Scheme:**
  - Primary: `#1D5F9F` (app blue)
  - Background: `#020817` (dark) / `#FFFFFF` (light)
  - Text: High contrast for readability
  - Platform colors: Use official brand colors

- **Typography:**
  - Title: Bold, 20-24sp
  - Body: Regular, 16sp
  - Score: Bold, 32-40sp

- **Spacing:**
  - Padding: 16dp default
  - Margin between elements: 12-16dp
  - Button height: 48-56dp

### Interaction Design:
- **Animations:**
  - Modal entrance: Slide up + fade in (300ms)
  - Button press: Scale down to 0.95 (100ms)
  - Success state: Check mark + pulse (400ms)

- **Feedback:**
  - Visual feedback on all touchable elements
  - Loading spinners for async operations
  - Success/error toasts
  - Haptic feedback on button press (light impact)

### Accessibility:
- All interactive elements have minimum 48x48dp touch target
- Proper labels for screen readers
- Color contrast ratio ≥ 4.5:1 for text
- Focus indicators for keyboard navigation
- Alternative text for all icons

---

## 🐛 Error Handling

### Scenarios to Handle:
1. **App not installed** → Show message "Please install [Platform] to share"
2. **Network error** → Show "Check your internet connection"
3. **Image generation failed** → Show "Unable to create share image" + retry button
4. **Share cancelled** → Silent, just close modal
5. **Unknown error** → Show generic error + retry button

### Error Logging:
```typescript
console.error('[SHARE_ERROR]', {
  platform,
  errorType,
  errorMessage,
  stack,
  timestamp,
  userAction: 'retry_available'
});
```

---

## 📊 Success Metrics

Track these metrics to measure success:
- Share button click rate (% of users who see scoreboard and click share)
- Share completion rate (% of initiated shares that complete)
- Most popular platform
- Shares per session
- Viral coefficient (shares / active users)

---

## 🚀 Deployment Checklist

Before releasing:
- ✅ All test cases passed
- ✅ Screenshots documented for validation
- ✅ Analytics verified
- ✅ Old logs removed
- ✅ New share logs added and tested
- ✅ TypeScript compilation successful (`npx tsc --noEmit`)
- ✅ App builds successfully (Android + iOS)
- ✅ Tested on physical devices (Android + iOS)
- ✅ Dark mode and light mode both tested
- ✅ Accessibility tested with screen reader
- ✅ Performance benchmarks met
- ✅ Error states all tested
- ✅ Platform-specific guidelines followed (TikTok, Instagram, etc.)

---

## 📝 Notes

- **TikTok Integration:** Already have TikTok SDK configured in `app.json`. Use existing credentials.
- **Instagram Stories:** Requires Instagram app installed. No API key needed for basic sharing.
- **Image Generation:** Consider caching generated images to improve performance on repeated shares.
- **Privacy:** Don't include personal information in shared images without user consent.
- **Localization:** Consider translating share messages for different languages (current app appears to be in French).

---

## 🔗 Resources

- [TikTok Share Kit Documentation](https://developers.tiktok.com/doc/share-kit-overview/)
- [React Native Share](https://github.com/react-native-share/react-native-share)
- [Instagram Sharing Guidelines](https://developers.facebook.com/docs/instagram-platform)
- [React Native View Shot](https://github.com/gre/react-native-view-shot)

---

**Remember:** Validation with screenshots is CRITICAL. After each step, take screenshots to verify:
- Visual design matches requirements
- No layout issues
- Text is readable
- Colors are correct
- Animations are smooth
- Error states display properly

Take your time with UX/UI - this feature will be highly visible to users and represents the app's brand when shared publicly.
