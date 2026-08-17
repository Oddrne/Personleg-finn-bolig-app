import Foundation

public struct Listing: Codable, Identifiable, Sendable {
    public let id: String
    public let title: String
    public let municipality: String
    public let price: Int
    public let buildYear: Int?
    public let bikeMinutesToVestly: Int?
    public let transitMinutesToJattavagen: Int?
    public let walkMinutesToGrocery: Int?
    public let explanation: String?

    public init(
        id: String,
        title: String,
        municipality: String,
        price: Int,
        buildYear: Int?,
        bikeMinutesToVestly: Int?,
        transitMinutesToJattavagen: Int?,
        walkMinutesToGrocery: Int?,
        explanation: String?
    ) {
        self.id = id
        self.title = title
        self.municipality = municipality
        self.price = price
        self.buildYear = buildYear
        self.bikeMinutesToVestly = bikeMinutesToVestly
        self.transitMinutesToJattavagen = transitMinutesToJattavagen
        self.walkMinutesToGrocery = walkMinutesToGrocery
        self.explanation = explanation
    }
}

public enum SwipeDecision: String, Codable, Sendable {
    case like = "LIKE"
    case dislike = "DISLIKE"
}

public struct SwipeRequest: Codable, Sendable {
    public let userId: String
    public let householdId: String
    public let listingId: String
    public let decision: SwipeDecision
}
