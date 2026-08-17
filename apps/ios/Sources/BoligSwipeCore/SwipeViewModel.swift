import Foundation

@MainActor
public final class SwipeViewModel {
    public private(set) var listings: [Listing] = []
    private let apiClient: APIClient
    private let userId: String
    private let householdId: String

    public init(apiClient: APIClient, userId: String, householdId: String) {
        self.apiClient = apiClient
        self.userId = userId
        self.householdId = householdId
    }

    public func refresh() async throws {
        listings = try await apiClient.fetchListings(userId: userId)
    }

    public func swipeTopCard(decision: SwipeDecision) async throws {
        guard let listing = listings.first else { return }
        let payload = SwipeRequest(userId: userId, householdId: householdId, listingId: listing.id, decision: decision)
        try await apiClient.sendSwipe(payload)
        listings.removeFirst()
    }
}
