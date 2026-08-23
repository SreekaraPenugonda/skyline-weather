# Skyline Weather mobile widgets

## Android

Open `mobile/android` in Android Studio. Set `mobile/android/app/src/main/res/values/strings.xml` `weather_api_url` to the deployed API endpoint, for example `https://your-api.example.com/api/weather/London`. Click **Sync Project with Gradle Files**, then **Run** to install the Skyline Weather app on your Android phone or emulator. After installation, long-press an empty area on the phone home screen, choose **Widgets**, search for **Skyline Weather**, and drag the widget onto the home screen.

The widget will not appear in the phone's widget picker until the Android APK is built and installed. A website or PWA alone cannot register a native Android home-screen widget.

## Build without Android Studio

The repository includes a GitHub Actions workflow at `.github/workflows/build-android-widget.yml`.

1. Push the project to GitHub.
2. Open the repository's **Actions** tab.
3. Select **Build Android Weather Widget**.
4. Choose **Run workflow**.
5. Download the `skyline-weather-widget-debug` artifact on your phone or computer.
6. Install the APK on Android, then add **Skyline Weather** from the home-screen widget picker.

Before building, replace `weather_api_url` in `android/app/src/main/res/values/strings.xml` with your deployed API URL. Android may require allowing installation from the browser or file manager used to download the APK.

The widget uses Jetpack Glance, refreshes every 30 minutes, and displays the last successful city, temperature, and condition.

## iOS

`ios/SkylineWeatherWidget.swift` is the WidgetKit source template. Create an iOS App project in Xcode, add a Widget Extension, replace its widget source with this file, and set the deployed API URL in the provider before signing and running on an Apple device. Xcode and macOS are required to compile and publish iOS widgets.
