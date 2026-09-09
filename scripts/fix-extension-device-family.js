#!/usr/bin/env node

// @bacons/apple-targets hardcodes TARGETED_DEVICE_FAMILY = "1,2" (iPhone +
// iPad) for every extension target it creates (device-activity-monitor,
// shield-action, shield-config, widget) — there's no config option to
// override it, and it adds these targets via its own mechanism that runs
// after the standard Expo config-plugin mod pipeline, so a regular config
// plugin can't intercept it either.
//
// An iPhone-only main app (ios.supportsTablet: false, TARGETED_DEVICE_FAMILY
// = 1) bundled with iPad-capable extensions (1,2) makes App Store Connect's
// binary validator treat the whole app as iPad-capable, which triggers an
// automatic "runs on Apple Silicon Mac" compatibility check (ITMS-90863) —
// and that check fails because ExpoModulesCore has no macOS build.
//
// Run this after `expo prebuild --platform ios` (see eas.json's
// build.production.ios.prebuildCommand) to force every non-main-app target
// back to iPhone-only, keeping the whole bundle iPhone-only and avoiding the
// Mac check entirely.

const fs = require('fs');
const path = require('path');
const xcode = require('xcode');

const projectName = 'app';
const pbxprojPath = path.join(__dirname, '..', 'ios', `${projectName}.xcodeproj`, 'project.pbxproj');

// This hook runs for every EAS build (Android included), but there's only an
// ios/ project to patch after `expo prebuild --platform ios`. Skip quietly
// on Android/EAS-managed builds instead of throwing ENOENT.
if (!fs.existsSync(pbxprojPath)) {
  console.log('[fix-extension-device-family] no ios/ project found — skipping (not an iOS build)');
  process.exit(0);
}

const project = xcode.project(pbxprojPath);
project.parseSync();

const configurations = project.pbxXCBuildConfigurationSection();
let changed = 0;
for (const key in configurations) {
  const entry = configurations[key];
  if (!entry?.buildSettings?.TARGETED_DEVICE_FAMILY) continue;
  if (entry.buildSettings.PRODUCT_NAME === 'app') continue;
  if (entry.buildSettings.TARGETED_DEVICE_FAMILY === '"1,2"') {
    entry.buildSettings.TARGETED_DEVICE_FAMILY = '1';
    changed++;
  }
}

if (changed === 0) {
  console.error('[fix-extension-device-family] found 0 matching build configs — did the ios/ project structure change?');
  process.exit(1);
}

fs.writeFileSync(pbxprojPath, project.writeSync());
console.log(`[fix-extension-device-family] forced ${changed} extension build configs to iPhone-only`);
