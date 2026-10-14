const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync, spawnSync } = require("node:child_process");
const { argumentosVideoWhatsapp } = require("../lib/video-format");

const local = name => process.env[`${name.toUpperCase()}_PATH`] ||
    (process.platform === "win32" ? path.resolve(__dirname, `../${name}.exe`) : name);
const ffmpeg = local("ffmpeg"), ffprobe = local("ffprobe");
const disponible = [ffmpeg, ffprobe].every(bin => spawnSync(bin, ["-version"], { windowsHide: true }).status === 0);

test("convierte VP9/Opus a MP4 H.264/AAC reproducible, con faststart", { skip: !disponible }, () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "jabesht-video-"));
    const input = path.join(dir, "source.webm"), output = path.join(dir, "whatsapp.mp4");
    const run = args => execFileSync(ffmpeg, args, { windowsHide: true, timeout: 60_000, stdio: "pipe" });
    try {
        run(["-y", "-v", "error", "-f", "lavfi", "-i", "testsrc2=size=320x180:rate=24",
            "-f", "lavfi", "-i", "sine=frequency=440", "-t", "1", "-c:v", "libvpx-vp9", "-c:a", "libopus", input]);
        run(argumentosVideoWhatsapp(input, output));
        const info = JSON.parse(execFileSync(ffprobe, ["-v", "error", "-show_streams", "-of", "json", output], { windowsHide: true }));
        assert.equal(info.streams.find(s => s.codec_type === "video").codec_name, "h264");
        assert.equal(info.streams.find(s => s.codec_type === "video").pix_fmt, "yuv420p");
        assert.equal(info.streams.find(s => s.codec_type === "audio").codec_name, "aac");
        run(["-v", "error", "-xerror", "-i", output, "-f", "null", "-"]);
        const bytes = fs.readFileSync(output);
        assert.ok(bytes.indexOf(Buffer.from("moov")) < bytes.indexOf(Buffer.from("mdat")));
        fs.writeFileSync(input, "archivo dañado");
        assert.throws(() => run(argumentosVideoWhatsapp(input, output)));
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});
