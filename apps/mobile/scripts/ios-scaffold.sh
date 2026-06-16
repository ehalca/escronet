#!/bin/bash
# Generate the EscronetApp.xcodeproj on macOS.
# Run once per machine (or in CI) before `pod install`.
# Requires: node, npx, ruby
# Optional: `gem install xcodeproj` — needed to add custom native modules to the project.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MOBILE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
IOS_DIR="$MOBILE_DIR/ios"
APP_NAME="EscronetApp"
BUNDLE_ID="com.escronet.app"

echo "→ ios-scaffold: generating Xcode project for $APP_NAME"

if [ -f "$IOS_DIR/$APP_NAME.xcodeproj/project.pbxproj" ]; then
  echo "  xcodeproj already exists — skipping generation"
else
  TEMP_DIR=$(mktemp -d)
  trap 'rm -rf "$TEMP_DIR"' EXIT

  echo "  scaffolding vanilla RN project in $TEMP_DIR ..."
  cd "$TEMP_DIR"
  npx --yes @react-native-community/cli@15 init "$APP_NAME" \
    --skip-install \
    --skip-git-init \
    --directory "$TEMP_DIR/scaffold" 2>&1 | tail -5

  echo "  copying xcodeproj ..."
  cp -r "$TEMP_DIR/scaffold/ios/$APP_NAME.xcodeproj" "$IOS_DIR/"

  echo "  setting bundle identifier to $BUNDLE_ID ..."
  sed -i '' \
    "s/org\.reactjs\.native\.example\.$APP_NAME/$BUNDLE_ID/g" \
    "$IOS_DIR/$APP_NAME.xcodeproj/project.pbxproj"

  # Replace template AppDelegate with ours (already committed to ios/EscronetApp/)
  rm -f "$IOS_DIR/$APP_NAME/AppDelegate.mm"
  rm -f "$IOS_DIR/$APP_NAME/AppDelegate.h"

  echo "  xcodeproj generated."
fi

# Add custom native module files to the Xcode project via xcodeproj gem
if gem list -i xcodeproj > /dev/null 2>&1; then
  echo "  adding IOSCallMonitorModule to xcodeproj ..."
  ruby - "$IOS_DIR/$APP_NAME.xcodeproj" "$APP_NAME" <<'RUBY'
require 'xcodeproj'
project_path, group_name = ARGV[0], ARGV[1]
project = Xcodeproj::Project.open(project_path)
target = project.targets.first
group = project.main_group.find_subpath(group_name, false)

%w[IOSCallMonitorModule.swift IOSCallMonitorModule.m].each do |filename|
  next if group.children.any? { |c| c.display_name == filename }
  ref = group.new_file(filename)
  target.source_build_phase.add_file_reference(ref)
  puts "    added #{filename}"
end

project.save
RUBY
else
  echo "  ⚠ xcodeproj gem not installed — add IOSCallMonitorModule files manually in Xcode"
  echo "    (run: gem install xcodeproj && ./scripts/ios-scaffold.sh)"
fi

echo "✓ Done. Next: cd ios && pod install"
