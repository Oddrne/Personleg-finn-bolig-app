import Testing
@testable import BoligSwipeCore

@Test
func swipeDecisionEncoding() throws {
    let data = try JSONEncoder().encode(SwipeDecision.like)
    #expect(String(decoding: data, as: UTF8.self) == "\"LIKE\"")
}
