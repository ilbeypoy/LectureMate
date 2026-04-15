import Foundation
import UIKit

final class ExportService {

    // MARK: - Metin Olarak Disa Aktarma

    func exportAsText(recording: LMRecording) -> String {
        var text = ""
        text += "DERS KAYDI\n"
        text += String(repeating: "=", count: 40) + "\n\n"
        text += "Baslik: \(recording.title)\n"

        if let className = recording.classRef?.name {
            text += "Ders: \(className)\n"
        }

        let formatter = DateFormatter()
        formatter.dateFormat = "dd.MM.yyyy HH:mm"
        formatter.locale = Locale(identifier: "tr-TR")
        text += "Tarih: \(formatter.string(from: recording.recordedAt))\n"
        text += "Sure: \(recording.formattedDuration)\n"

        if let summary = recording.aiSummary {
            text += "\n" + String(repeating: "-", count: 40) + "\n"
            text += "AI OZET\n"
            text += String(repeating: "-", count: 40) + "\n"
            text += summary + "\n"
        }

        text += "\n" + String(repeating: "-", count: 40) + "\n"
        text += "TRANSKRIPT\n"
        text += String(repeating: "-", count: 40) + "\n\n"

        let sortedSegments = recording.segments.sorted { $0.startTime < $1.startTime }
        for segment in sortedSegments {
            let timeStamp = formatTimestamp(segment.startTime)
            text += "[\(timeStamp)] \(segment.text)\n"
        }

        if recording.segments.isEmpty {
            text += recording.fullTranscript
        }

        return text
    }

    // MARK: - PDF Olarak Disa Aktarma

    func exportAsPDF(recording: LMRecording) -> Data {
        let pageWidth: CGFloat = 612
        let pageHeight: CGFloat = 792
        let margin: CGFloat = 50

        let pdfRenderer = UIGraphicsPDFRenderer(bounds: CGRect(x: 0, y: 0, width: pageWidth, height: pageHeight))

        let data = pdfRenderer.pdfData { context in
            context.beginPage()
            var yPosition: CGFloat = margin

            // Baslik
            let titleFont = UIFont.boldSystemFont(ofSize: 20)
            let titleAttributes: [NSAttributedString.Key: Any] = [.font: titleFont]
            let titleRect = CGRect(x: margin, y: yPosition, width: pageWidth - 2 * margin, height: 30)
            recording.title.draw(in: titleRect, withAttributes: titleAttributes)
            yPosition += 35

            // Meta bilgiler
            let metaFont = UIFont.systemFont(ofSize: 12, weight: .regular)
            let metaColor = UIColor.gray
            let metaAttributes: [NSAttributedString.Key: Any] = [.font: metaFont, .foregroundColor: metaColor]

            if let className = recording.classRef?.name {
                let classRect = CGRect(x: margin, y: yPosition, width: pageWidth - 2 * margin, height: 18)
                "Ders: \(className)".draw(in: classRect, withAttributes: metaAttributes)
                yPosition += 20
            }

            let formatter = DateFormatter()
            formatter.dateFormat = "dd.MM.yyyy HH:mm"
            formatter.locale = Locale(identifier: "tr-TR")
            let dateRect = CGRect(x: margin, y: yPosition, width: pageWidth - 2 * margin, height: 18)
            "Tarih: \(formatter.string(from: recording.recordedAt)) | Sure: \(recording.formattedDuration)".draw(in: dateRect, withAttributes: metaAttributes)
            yPosition += 30

            // AI Ozet
            if let summary = recording.aiSummary {
                let summaryHeaderFont = UIFont.boldSystemFont(ofSize: 14)
                let summaryHeaderRect = CGRect(x: margin, y: yPosition, width: pageWidth - 2 * margin, height: 20)
                "Ozet".draw(in: summaryHeaderRect, withAttributes: [.font: summaryHeaderFont])
                yPosition += 25

                let bodyFont = UIFont.systemFont(ofSize: 11)
                let bodyAttributes: [NSAttributedString.Key: Any] = [.font: bodyFont]
                let summarySize = summary.boundingRect(
                    with: CGSize(width: pageWidth - 2 * margin, height: .greatestFiniteMagnitude),
                    options: .usesLineFragmentOrigin,
                    attributes: bodyAttributes,
                    context: nil
                )
                let summaryRect = CGRect(x: margin, y: yPosition, width: pageWidth - 2 * margin, height: summarySize.height)
                summary.draw(in: summaryRect, withAttributes: bodyAttributes)
                yPosition += summarySize.height + 20
            }

            // Transkript
            let transcriptHeaderFont = UIFont.boldSystemFont(ofSize: 14)
            let transcriptHeaderRect = CGRect(x: margin, y: yPosition, width: pageWidth - 2 * margin, height: 20)
            "Transkript".draw(in: transcriptHeaderRect, withAttributes: [.font: transcriptHeaderFont])
            yPosition += 25

            let bodyFont = UIFont.systemFont(ofSize: 10)
            let timeFont = UIFont.monospacedSystemFont(ofSize: 9, weight: .medium)
            let timeColor = UIColor.systemBlue

            let sortedSegments = recording.segments.sorted { $0.startTime < $1.startTime }

            for segment in sortedSegments {
                let lineText = segment.text
                let timeText = "[\(formatTimestamp(segment.startTime))]"

                let lineSize = lineText.boundingRect(
                    with: CGSize(width: pageWidth - 2 * margin - 60, height: .greatestFiniteMagnitude),
                    options: .usesLineFragmentOrigin,
                    attributes: [.font: bodyFont],
                    context: nil
                )

                // Yeni sayfa gerekirse
                if yPosition + lineSize.height + 5 > pageHeight - margin {
                    context.beginPage()
                    yPosition = margin
                }

                // Zaman damgasi
                timeText.draw(
                    in: CGRect(x: margin, y: yPosition, width: 55, height: 15),
                    withAttributes: [.font: timeFont, .foregroundColor: timeColor]
                )

                // Metin
                lineText.draw(
                    in: CGRect(x: margin + 60, y: yPosition, width: pageWidth - 2 * margin - 60, height: lineSize.height),
                    withAttributes: [.font: bodyFont]
                )

                yPosition += lineSize.height + 5
            }
        }

        return data
    }

    // MARK: - Dosya Kaydetme

    func saveExportedText(_ text: String, filename: String) -> URL? {
        let tempDir = FileManager.default.temporaryDirectory
        let fileURL = tempDir.appendingPathComponent("\(filename).txt")
        do {
            try text.write(to: fileURL, atomically: true, encoding: .utf8)
            return fileURL
        } catch {
            return nil
        }
    }

    func saveExportedPDF(_ data: Data, filename: String) -> URL? {
        let tempDir = FileManager.default.temporaryDirectory
        let fileURL = tempDir.appendingPathComponent("\(filename).pdf")
        do {
            try data.write(to: fileURL)
            return fileURL
        } catch {
            return nil
        }
    }

    // MARK: - Helpers

    private func formatTimestamp(_ time: TimeInterval) -> String {
        let minutes = Int(time) / 60
        let seconds = Int(time) % 60
        return String(format: "%02d:%02d", minutes, seconds)
    }
}
