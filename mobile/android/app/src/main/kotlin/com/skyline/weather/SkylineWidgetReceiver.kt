package com.skyline.weather

import android.content.Context
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.appWidgetBackground
import androidx.glance.appwidget.provideContent
import androidx.glance.layout.Alignment
import androidx.glance.layout.Column
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.padding
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import androidx.glance.unit.dp
import androidx.compose.ui.graphics.Color
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class SkylineWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = SkylineWeatherWidget
}

object SkylineWeatherWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        withContext(Dispatchers.IO) { WidgetRepository.refresh(context) }
        provideContent {
            val weather = WidgetRepository.read(context)
            Column(
                modifier = GlanceModifier.fillMaxSize().appWidgetBackground().padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(weather.city, style = TextStyle(color = ColorProvider(Color.White)))
                Text("${weather.temperature}°C", style = TextStyle(color = ColorProvider(Color.White)))
                Text(weather.condition, style = TextStyle(color = ColorProvider(Color.White)))
            }
        }
    }
}

data class WidgetWeather(val city: String = "Skyline", val temperature: Int = 0, val condition: String = "Open app to refresh")

object WidgetRepository {
    private val client = OkHttpClient()
    fun read(context: Context): WidgetWeather = context.getSharedPreferences("weather", Context.MODE_PRIVATE).getString("data", null)?.let { value ->
        runCatching { JSONObject(value).let { WidgetWeather(it.optString("city", "Skyline"), it.optDouble("temperature", 0.0).toInt(), it.optString("condition", "Open app to refresh")) } }.getOrNull()
    } ?: WidgetWeather()
    suspend fun refresh(context: Context) {
        runCatching {
            val response = client.newCall(Request.Builder().url(context.getString(R.string.weather_api_url)).build()).execute()
            if (response.isSuccessful) context.getSharedPreferences("weather", Context.MODE_PRIVATE).edit().putString("data", response.body?.string()).apply()
        }
    }
}
