// encode-web-video.swift — trim + compress footage to a clean, web-optimised, muted MP4.
// Usage: encode-web-video <input> <output.mp4> <startSec> <durationSec> <maxHeight>
// maxHeight picks the H.264 preset bucket: 1080 -> 1920x1080, 720 -> 1280x720, 480 -> 640x480 (aspect preserved).
// Strips audio (the site plays everything muted) and front-loads the moov atom for instant streaming.

import AVFoundation
import Foundation

let a = CommandLine.arguments
guard a.count >= 6, let start = Double(a[3]), let dur = Double(a[4]), let maxH = Double(a[5]) else {
    FileHandle.standardError.write(Data("usage: input output startSec durationSec maxHeight\n".utf8)); exit(2)
}
let input = URL(fileURLWithPath: a[1])
let output = URL(fileURLWithPath: a[2])
try? FileManager.default.removeItem(at: output)

func fail(_ msg: String, _ code: Int32) -> Never {
    FileHandle.standardError.write(Data((msg + "\n").utf8)); exit(code)
}

func run() async {
    let asset = AVURLAsset(url: input, options: [AVURLAssetPreferPreciseDurationAndTimingKey: true])
    do {
        let vTracks = try await asset.loadTracks(withMediaType: .video)
        guard let vTrack = vTracks.first else { fail("no video track in \(input.lastPathComponent)", 3) }
        let total = CMTimeGetSeconds(try await asset.load(.duration))
        let transform = try await vTrack.load(.preferredTransform)

        let safeStart = max(0, min(start, max(0, total - 0.2)))
        let safeDur = max(0.2, min(dur, total - safeStart))

        // video-only composition: no audio, exactly the chosen window
        let comp = AVMutableComposition()
        guard let cv = comp.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid)
        else { fail("could not add track", 4) }
        let range = CMTimeRange(start: CMTime(seconds: safeStart, preferredTimescale: 600),
                                duration: CMTime(seconds: safeDur, preferredTimescale: 600))
        try cv.insertTimeRange(range, of: vTrack, at: .zero)
        cv.preferredTransform = transform   // keep portrait/landscape orientation

        let preset = maxH >= 1080 ? AVAssetExportPreset1920x1080
                   : maxH >= 720  ? AVAssetExportPreset1280x720
                                  : AVAssetExportPreset640x480
        guard let export = AVAssetExportSession(asset: comp, presetName: preset) else { fail("no export session", 6) }
        export.outputURL = output
        export.outputFileType = .mp4
        export.shouldOptimizeForNetworkUse = true

        await withCheckedContinuation { (c: CheckedContinuation<Void, Never>) in
            export.exportAsynchronously { c.resume() }
        }

        if export.status == .completed {
            let bytes = ((try? FileManager.default.attributesOfItem(atPath: output.path))?[.size] as? Int) ?? 0
            print("OK  \(output.lastPathComponent)  \(String(format: "%.1f", safeStart))s+\(String(format: "%.1f", safeDur))s  \(bytes/1024)KB  \(preset)")
            exit(0)
        } else {
            fail("export failed: \(export.error?.localizedDescription ?? "unknown")", 7)
        }
    } catch { fail("error: \(error)", 8) }
}

let sem = DispatchSemaphore(value: 0)
Task { await run(); sem.signal() }
sem.wait()
