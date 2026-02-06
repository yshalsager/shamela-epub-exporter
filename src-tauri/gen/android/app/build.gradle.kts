import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("rust")
}

val tauriProperties = Properties().apply {
    val propFile = file("tauri.properties")
    if (propFile.exists()) {
        propFile.inputStream().use { load(it) }
    }
}

val key_properties = Properties().apply {
    val key_file = rootProject.file("key.properties")
    if (key_file.exists()) {
        key_file.inputStream().use { load(it) }
    }
}
val store_file = key_properties.getProperty("storeFile") ?: System.getenv("ANDROID_KEYSTORE_PATH")
val store_password = key_properties.getProperty("storePassword") ?: System.getenv("ANDROID_KEYSTORE_PASSWORD")
val key_alias = key_properties.getProperty("keyAlias") ?: System.getenv("ANDROID_KEY_ALIAS")
val key_password = key_properties.getProperty("keyPassword") ?: System.getenv("ANDROID_KEY_PASSWORD")
val has_release_signing = store_file != null && store_password != null && key_alias != null && key_password != null

android {
    compileSdk = 36
    namespace = "com.yshalsager.shamela_epub_exporter"
    defaultConfig {
        manifestPlaceholders["usesCleartextTraffic"] = "false"
        applicationId = "com.yshalsager.shamela_epub_exporter"
        minSdk = 24
        targetSdk = 36
        versionCode = tauriProperties.getProperty("tauri.android.versionCode", "1").toInt()
        versionName = tauriProperties.getProperty("tauri.android.versionName", "1.0")
    }
    signingConfigs {
        create("release") {
            if (has_release_signing) {
                storeFile = rootProject.file(store_file!!)
                storePassword = store_password
                keyAlias = key_alias
                keyPassword = key_password
            }
        }
    }
    buildTypes {
        getByName("debug") {
            manifestPlaceholders["usesCleartextTraffic"] = "true"
            isDebuggable = true
            isJniDebuggable = true
            isMinifyEnabled = false
            packaging {                jniLibs.keepDebugSymbols.add("*/arm64-v8a/*.so")
                jniLibs.keepDebugSymbols.add("*/armeabi-v7a/*.so")
                jniLibs.keepDebugSymbols.add("*/x86/*.so")
                jniLibs.keepDebugSymbols.add("*/x86_64/*.so")
            }
        }
        getByName("release") {
            isMinifyEnabled = true
            proguardFiles(
                *fileTree(".") { include("**/*.pro") }
                    .plus(getDefaultProguardFile("proguard-android-optimize.txt"))
                    .toList().toTypedArray()
            )
            if (has_release_signing) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
    }
    kotlinOptions {
        jvmTarget = "1.8"
    }
    buildFeatures {
        buildConfig = true
    }
}

rust {
    rootDirRel = "../../../"
}

dependencies {
    implementation("androidx.webkit:webkit:1.15.0")
    implementation("androidx.appcompat:appcompat:1.7.1")
    implementation("androidx.activity:activity-ktx:1.12.3")
    implementation("com.google.android.material:material:1.13.0")
    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.3.0")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.7.0")
}

apply(from = "tauri.build.gradle.kts")
