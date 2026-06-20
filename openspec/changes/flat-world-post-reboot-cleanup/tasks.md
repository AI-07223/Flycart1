## 1. Runtime Asset Cleanup

- [x] 1.1 Remove the unused `three/addons` import-map entry and replace the broken shell-based vendor refresh with a cross-platform vendor script that stops copying globe-era CSS3D and post-processing addons
- [x] 1.2 Delete the now-unused vendored addon files from `public/vendor/jsm/`

## 2. Artifact Maintainability

- [x] 2.1 Restore readable multi-line formatting for reboot-touched maintained test artifacts without changing their assertions
- [x] 2.2 Regenerate checked-in browser JavaScript from maintained source after the cleanup edits

## 3. Verification

- [x] 3.1 Run build and test verification after the cleanup pass
