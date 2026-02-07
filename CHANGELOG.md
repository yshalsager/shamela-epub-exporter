# Changelog

## v1.2.1

[compare changes](https://github.com/yshalsager/shamela-epub-exporter/compare/v1.2.0...v1.2.1)

### 🩹 Fixes

- **android:** Update build script for gradle 9 ([c7ec561](https://github.com/yshalsager/shamela-epub-exporter/commit/c7ec561))
- **android:** Make BuildTask exec gradle9-compatible ([13be081](https://github.com/yshalsager/shamela-epub-exporter/commit/13be081))
- Pin java version to openjdk-21.0.2 ([4fc7c84](https://github.com/yshalsager/shamela-epub-exporter/commit/4fc7c84))

### 🏡 Chore

- **eslint:** Update configuration to ignore pnpm-lock.yaml ([ee0e18b](https://github.com/yshalsager/shamela-epub-exporter/commit/ee0e18b))

### ❤️ Contributors

- Yshalsager <ysh-alsager@hotmail.com>

## v1.2.0

[compare changes](https://github.com/yshalsager/shamela-epub-exporter/compare/v1.1.2...v1.2.0)

### 🚀 Enhancements

- Add dark mode support and theme toggle ([7f66237](https://github.com/yshalsager/shamela-epub-exporter/commit/7f66237))

### 🩹 Fixes

- **ci:** Expand android key.properties variables ([de125c3](https://github.com/yshalsager/shamela-epub-exporter/commit/de125c3))
- **ci:** Ensure artifacts are found before creating release ([0160c47](https://github.com/yshalsager/shamela-epub-exporter/commit/0160c47))
- **deps:** Update all non-major dependencies ([#10](https://github.com/yshalsager/shamela-epub-exporter/pull/10))
- **deps:** Update dependency org.jetbrains.kotlin:kotlin-gradle-plugin to v2 ([#16](https://github.com/yshalsager/shamela-epub-exporter/pull/16))
- **deps:** Update dependency com.android.tools.build:gradle to v9 ([#13](https://github.com/yshalsager/shamela-epub-exporter/pull/13))
- **deps:** Correct java version of openjdk-25.0.2 ([fc3caf5](https://github.com/yshalsager/shamela-epub-exporter/commit/fc3caf5))

### 📖 Documentation

- Add download section for Windows, macOS, Linux, and Android in README files ([3c9a197](https://github.com/yshalsager/shamela-epub-exporter/commit/3c9a197))

### 🏡 Chore

- **README:** Update description ([253590e](https://github.com/yshalsager/shamela-epub-exporter/commit/253590e))
- **renovate:** Group non-major updates ([d557b5b](https://github.com/yshalsager/shamela-epub-exporter/commit/d557b5b))
- Update .prettierignore and eslint configuration; add new lint:fix script ([b84b455](https://github.com/yshalsager/shamela-epub-exporter/commit/b84b455))

### 🤖 CI

- **release:** Update GitHub Actions bot configuration for commits ([96345d6](https://github.com/yshalsager/shamela-epub-exporter/commit/96345d6))
- **release:** Add flags to skip tauri and submit stores ([6b41d08](https://github.com/yshalsager/shamela-epub-exporter/commit/6b41d08))

### ❤️ Contributors

- Yshalsager <ysh-alsager@hotmail.com>
- Youssif Shaaban Alsager <ysh-alsager@hotmail.com>

## v1.1.2

[compare changes](https://github.com/yshalsager/shamela-epub-exporter/compare/v1.1.1...v1.1.2)

### 🩹 Fixes

- **config:** Update zip excludeSources to include additional directories ([b63e67a](https://github.com/yshalsager/shamela-epub-exporter/commit/b63e67a))
- **ci:** Correct artifacts paths ([753f389](https://github.com/yshalsager/shamela-epub-exporter/commit/753f389))
- **style:** Add safe area top padding for tauri ([6545996](https://github.com/yshalsager/shamela-epub-exporter/commit/6545996))

### 🤖 CI

- **release:** Allow manual runs without creating tag ([62b07c6](https://github.com/yshalsager/shamela-epub-exporter/commit/62b07c6))
- **release:** Use tauri build ([26615f3](https://github.com/yshalsager/shamela-epub-exporter/commit/26615f3))
- **release:** Support android release signing via secrets ([3fa54ba](https://github.com/yshalsager/shamela-epub-exporter/commit/3fa54ba))
- **release:** Add android i686 and split per abi ([d3f5ff6](https://github.com/yshalsager/shamela-epub-exporter/commit/d3f5ff6))

### ❤️ Contributors

- Yshalsager <ysh-alsager@hotmail.com>

## v1.1.1

[compare changes](https://github.com/yshalsager/shamela-epub-exporter/compare/v1.1.0...v1.1.1)

### 🏡 Chore

- Update CHANGELOG for v1.1.0 ([520fa01](https://github.com/yshalsager/shamela-epub-exporter/commit/520fa01))

### 🤖 CI

- **release:** Enhance release workflow with skip tag jobs logic ([d218d5c](https://github.com/yshalsager/shamela-epub-exporter/commit/d218d5c))
- **release:** Guard manual version bump on dispatch only ([fcbaee4](https://github.com/yshalsager/shamela-epub-exporter/commit/fcbaee4))
- **release:** Use matrix target in artifact name ([8e1bbb3](https://github.com/yshalsager/shamela-epub-exporter/commit/8e1bbb3))
- **release:** Add windows targets and pass matrix target ([5bfee42](https://github.com/yshalsager/shamela-epub-exporter/commit/5bfee42))

### ❤️ Contributors

- Yshalsager <ysh-alsager@hotmail.com>

## v1.0.0...v1.1.0

[compare changes](https://github.com/yshalsager/shamela-epub-exporter/compare/v1.0.0...v1.1.0)

### 🚀 Enhancements

- **tauri:** Add desktop app support ([48235df](https://github.com/yshalsager/shamela-epub-exporter/commit/48235df))
- **jobs:** Add retry action for failed jobs ([08cbf33](https://github.com/yshalsager/shamela-epub-exporter/commit/08cbf33))
- **jobs:** Update extension badge for job status ([bb5ad0f](https://github.com/yshalsager/shamela-epub-exporter/commit/bb5ad0f))

### 🩹 Fixes

- **jobs:** Show retry for canceled jobs ([aef83a2](https://github.com/yshalsager/shamela-epub-exporter/commit/aef83a2))
- **popup:** Adjust layout for tauri vs wxt platforms ([a22aa88](https://github.com/yshalsager/shamela-epub-exporter/commit/a22aa88))
- **ci:** Use default mise-action version ([36e499c](https://github.com/yshalsager/shamela-epub-exporter/commit/36e499c))
- **ci:** Remove explicit version from mise-action in release workflow ([bb5c29a](https://github.com/yshalsager/shamela-epub-exporter/commit/bb5c29a))
- **ci:** Sync and validate release versions ([1556b48](https://github.com/yshalsager/shamela-epub-exporter/commit/1556b48))
- **ci:** Resolve version source for non-tag dry runs ([9d8e584](https://github.com/yshalsager/shamela-epub-exporter/commit/9d8e584))

### 📖 Documentation

- **readme:** Add browser extension download links and images for Chrome and Firefox ([a15a7e1](https://github.com/yshalsager/shamela-epub-exporter/commit/a15a7e1))

### 🏡 Chore

- **deps-dev:** Bump svelte from 5.46.1 to 5.46.4 ([#3](https://github.com/yshalsager/shamela-epub-exporter/pull/3))
- **release:** V1.1.0 ([44fa913](https://github.com/yshalsager/shamela-epub-exporter/commit/44fa913))

### 🤖 CI

- **release:** Add GitHub Actions release pipeline ([857b3a5](https://github.com/yshalsager/shamela-epub-exporter/commit/857b3a5))
- **release:** Simplify workflow input condition checks ([fe61878](https://github.com/yshalsager/shamela-epub-exporter/commit/fe61878))
- **release:** Generate release notes from git tags ([4edb2c2](https://github.com/yshalsager/shamela-epub-exporter/commit/4edb2c2))

### ❤️ Contributors

- Yshalsager <ysh-alsager@hotmail.com>
