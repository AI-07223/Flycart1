## ADDED Requirements

### Requirement: Vendored renderer assets match active runtime imports
The repository SHALL vendor only the Three.js browser assets that are actively imported by the flat-world client runtime. Globe-era CSS3D and post-processing addons that are no longer referenced SHALL NOT remain in the vendoring workflow or checked-in vendor tree.

#### Scenario: Vendor refresh does not recreate dead globe-era addons
- **WHEN** maintainers run the vendor refresh workflow after the cleanup
- **THEN** it does not copy unused CSS3D or post-processing addon files back into `public/vendor/jsm/`

### Requirement: Browser import configuration reflects the active renderer path
The checked-in browser entry HTML SHALL expose only the import aliases needed by the active flat-world renderer path.

#### Scenario: Unused addon alias is removed
- **WHEN** the client boot HTML is loaded after cleanup
- **THEN** it does not advertise a `three/addons` import alias that the current renderer does not use
