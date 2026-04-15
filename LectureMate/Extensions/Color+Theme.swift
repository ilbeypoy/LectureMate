import SwiftUI

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3:
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6:
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8:
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }

    // Uygulama Renk Paleti
    static let lmPrimary = Color(hex: "#4A90D9")
    static let lmSecondary = Color(hex: "#7B68EE")
    static let lmAccent = Color(hex: "#FF6B6B")
    static let lmSuccess = Color(hex: "#51CF66")
    static let lmWarning = Color(hex: "#FFD43B")
    static let lmBackground = Color(hex: "#F8F9FA")
    static let lmCardBackground = Color(hex: "#FFFFFF")
    static let lmTextPrimary = Color(hex: "#212529")
    static let lmTextSecondary = Color(hex: "#6C757D")

    // Ders Renkleri
    static let classColors: [String] = [
        "#4A90D9", "#7B68EE", "#FF6B6B", "#51CF66",
        "#FFD43B", "#FF922B", "#20C997", "#845EF7",
        "#F06595", "#339AF0", "#22B8CF", "#94D82D"
    ]
}
