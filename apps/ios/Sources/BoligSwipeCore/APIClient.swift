import Foundation

public struct APIClient: Sendable {
    private let baseURL: URL
    private let session: URLSession

    public init(baseURL: URL, session: URLSession = .shared) {
        self.baseURL = baseURL
        self.session = session
    }

    public func fetchListings(userId: String) async throws -> [Listing] {
        var components = URLComponents(url: baseURL.appending(path: "/listings"), resolvingAgainstBaseURL: false)
        components?.queryItems = [URLQueryItem(name: "userId", value: userId)]
        guard let url = components?.url else { throw APIError.invalidURL }

        let (data, response) = try await session.data(from: url)
        try Self.validate(response: response)
        return try JSONDecoder().decode([Listing].self, from: data)
    }

    public func sendSwipe(_ request: SwipeRequest) async throws {
        var urlRequest = URLRequest(url: baseURL.appending(path: "/swipes"))
        urlRequest.httpMethod = "POST"
        urlRequest.addValue("application/json", forHTTPHeaderField: "Content-Type")
        urlRequest.httpBody = try JSONEncoder().encode(request)

        let (_, response) = try await session.data(for: urlRequest)
        try Self.validate(response: response)
    }

    private static func validate(response: URLResponse) throws {
        guard let http = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        guard (200..<300).contains(http.statusCode) else {
            throw APIError.serverError(http.statusCode)
        }
    }
}

public enum APIError: Error, Equatable {
    case invalidURL
    case invalidResponse
    case serverError(Int)
}
