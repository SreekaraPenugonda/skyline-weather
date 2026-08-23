import WidgetKit
import SwiftUI

struct WeatherEntry: TimelineEntry {
    let date: Date
    let city: String
    let temperature: Int
    let condition: String
}

struct WeatherProvider: TimelineProvider {
    func placeholder(in context: Context) -> WeatherEntry { WeatherEntry(date: .now, city: "Skyline", temperature: 22, condition: "Clear") }
    func getSnapshot(in context: Context, completion: @escaping (WeatherEntry) -> Void) { completion(placeholder(in: context)) }
    func getTimeline(in context: Context, completion: @escaping (Timeline<WeatherEntry>) -> Void) {
        let entry = placeholder(in: context)
        completion(Timeline(entries: [entry], policy: .after(.now.addingTimeInterval(1800))))
    }
}

struct SkylineWeatherWidgetView: View {
    let entry: WeatherEntry
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(entry.city).font(.headline)
            Text("\(entry.temperature)°").font(.system(size: 34, weight: .bold))
            Text(entry.condition).font(.caption)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .padding()
        .foregroundStyle(.white)
        .containerBackground(for: .widget) {
            LinearGradient(colors: [Color(red: 0.12, green: 0.31, blue: 0.29), Color(red: 0.92, green: 0.47, blue: 0.37)], startPoint: .topLeading, endPoint: .bottomTrailing)
        }
    }
}

@main
struct SkylineWeatherWidget: Widget {
    let kind = "SkylineWeatherWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: WeatherProvider()) { entry in SkylineWeatherWidgetView(entry: entry) }
            .configurationDisplayName("Skyline Weather")
            .description("See current weather at a glance.")
            .supportedFamilies([.systemSmall, .systemMedium])
    }
}
