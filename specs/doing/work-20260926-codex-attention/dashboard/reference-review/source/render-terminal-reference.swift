import AppKit
import Foundation

struct PixelRectangle: Decodable {
    let x: Int
    let y: Int
    let width: Int
    let height: Int
    let color: String
}

struct TextLine: Decodable {
    let column: Int
    let row: Int
    let text: String
    let color: String
    let isBold: Bool
}

struct TerminalScreen: Decodable {
    let name: String
    let columns: Int
    let rows: Int
    let cellWidthPx: Int
    let cellHeightPx: Int
    let fontSizePt: Double
    let background: String
    let rectangles: [PixelRectangle]
    let lines: [TextLine]
}

func colorFromHex(_ value: String) -> NSColor {
    let rgb = UInt32(value, radix: 16) ?? 0
    return NSColor(srgbRed: CGFloat((rgb >> 16) & 255) / 255,
                   green: CGFloat((rgb >> 8) & 255) / 255,
                   blue: CGFloat(rgb & 255) / 255, alpha: 1)
}

let arguments = CommandLine.arguments
if arguments.count != 3 {
    fatalError("Expected the terminal scene JSON path and the PNG output directory")
}
let input = URL(fileURLWithPath: arguments[1])
let output = URL(fileURLWithPath: arguments[2], isDirectory: true)
let screens = try JSONDecoder().decode([TerminalScreen].self, from: Data(contentsOf: input))
for screen in screens {
    let widthPx = screen.columns * screen.cellWidthPx
    let heightPx = screen.rows * screen.cellHeightPx
    guard let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: widthPx,
        pixelsHigh: heightPx, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true,
        isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: widthPx * 4, bitsPerPixel: 32),
        let graphics = NSGraphicsContext(bitmapImageRep: bitmap) else {
        fatalError("Unable to allocate the terminal reference bitmap")
    }
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = graphics
    graphics.cgContext.translateBy(x: 0, y: CGFloat(heightPx))
    graphics.cgContext.scaleBy(x: 1, y: -1)
    NSGraphicsContext.current = NSGraphicsContext(cgContext: graphics.cgContext, flipped: true)
    colorFromHex(screen.background).setFill()
    NSBezierPath(rect: NSRect(x: 0, y: 0, width: widthPx, height: heightPx)).fill()
    for rectangle in screen.rectangles {
        colorFromHex(rectangle.color).setFill()
        NSBezierPath(rect: NSRect(x: rectangle.x, y: rectangle.y,
            width: rectangle.width, height: rectangle.height)).fill()
    }
    for line in screen.lines {
        let font = NSFont.monospacedSystemFont(ofSize: screen.fontSizePt,
            weight: line.isBold ? .semibold : .regular)
        for (index, character) in line.text.enumerated() {
            let text = NSAttributedString(string: String(character), attributes: [
                .font: font, .foregroundColor: colorFromHex(line.color)
            ])
            let xPx = (line.column + index) * screen.cellWidthPx
            let yPx = line.row * screen.cellHeightPx + screen.cellHeightPx - Int(screen.fontSizePt) - 2
            text.draw(at: NSPoint(x: xPx, y: yPx))
        }
    }
    NSGraphicsContext.restoreGraphicsState()
    guard let png = bitmap.representation(using: .png, properties: [:]) else {
        fatalError("Unable to encode the terminal reference PNG")
    }
    try png.write(to: output.appendingPathComponent(screen.name + ".png"), options: .atomic)
    print("\(screen.name): \(widthPx)x\(heightPx) px")
}
