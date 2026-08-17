#if canImport(SwiftUI)
import SwiftUI

public struct SwipeCardView: View {
    private let listing: Listing

    public init(listing: Listing) {
        self.listing = listing
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(listing.title).font(.headline)
            Text("\(listing.municipality) · \(listing.price.formatted(.number.grouping(.automatic))) kr")
            if let explanation = listing.explanation {
                Text(explanation).font(.caption).foregroundStyle(.secondary)
            }
            HStack {
                if let bike = listing.bikeMinutesToVestly { Label("\(bike) min sykkel", systemImage: "bicycle") }
                if let transit = listing.transitMinutesToJattavagen { Label("\(transit) min kollektiv", systemImage: "tram") }
            }
            if let walk = listing.walkMinutesToGrocery {
                Label("\(walk) min til dagligvare", systemImage: "figure.walk")
            }
        }
        .padding()
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}
#endif
