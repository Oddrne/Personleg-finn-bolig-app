// swift-tools-version: 6.3
import PackageDescription

let package = Package(
    name: "BoligSwipe",
    platforms: [
        .iOS(.v17),
        .macOS(.v13)
    ],
    products: [
        .library(name: "BoligSwipeCore", targets: ["BoligSwipeCore"]),
        .executable(name: "BoligSwipeCLI", targets: ["BoligSwipeCLI"])
    ],
    targets: [
        .target(name: "BoligSwipeCore"),
        .executableTarget(name: "BoligSwipeCLI", dependencies: ["BoligSwipeCore"]),
        .testTarget(name: "iosTests", dependencies: ["BoligSwipeCore"])
    ],
    swiftLanguageModes: [.v6]
)
