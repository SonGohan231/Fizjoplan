plugins {
    id("com.android.application")
}

android {
    namespace = "pl.fizjogabinet.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "pl.fizjogabinet.app"
        minSdk = 26
        targetSdk = 35
        versionCode = 7
        versionName = "7.0"
    }

    buildTypes {
        debug {
            applicationIdSuffix = ".debug"
            versionNameSuffix = "-debug"
        }
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    implementation("androidx.webkit:webkit:1.12.1")
    implementation("androidx.core:core:1.15.0")
}
