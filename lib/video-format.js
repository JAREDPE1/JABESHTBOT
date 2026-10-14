// Convertir los códecs: cambiar solo la extensión o el contenedor no basta.
function argumentosVideoWhatsapp(entrada, salida) {
    return [
        "-y", "-nostdin", "-v", "error", "-xerror", "-i", entrada,
        "-map", "0:v:0", "-map", "0:a:0?", "-sn", "-dn",
        "-vf", "scale=w='min(1280,iw)':h='min(720,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2,setsar=1",
        "-r", "30", "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
        "-pix_fmt", "yuv420p", "-profile:v", "main", "-level:v", "3.1",
        "-c:a", "aac", "-b:a", "128k", "-ac", "2", "-ar", "48000",
        "-movflags", "+faststart", "-f", "mp4", salida,
    ];
}

module.exports = { argumentosVideoWhatsapp };
