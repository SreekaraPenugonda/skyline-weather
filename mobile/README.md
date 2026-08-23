# Skyline Weather mobile widgets

## Android

Open `mobile/android` in Android Studio. Set `mobile/android/app/src/main/res/values/strings.xml` `weather_api_url` to the deployed API endpoint, for example `https://your-api.example.com/api/weather/London`. Build and install the app, then add the Skyline Weather widget from the Android home-screen widget picker.

The widget uses Jetpack Glance, refreshes every 30 minutes, and displays the last successful city, temperature, and condition.

## iOS

`ios/SkylineWeatherWidget.swift` is the WidgetKit source template. Create an iOS App project in Xcode, add a Widget Extension, replace its widget source with this file, and set the deployed API URL in the provider before signing and running on an Apple device. Xcode and macOS are required to compile and publish iOS widgets.
