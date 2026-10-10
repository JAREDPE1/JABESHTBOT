"""Return the newest public Instagram video or reel as one JSON line."""

import itertools
import json
import os
import sys

import instaloader


def latest_video(username):
    loader = instaloader.Instaloader(
        quiet=True,
        download_pictures=False,
        download_videos=False,
        download_video_thumbnails=False,
        max_connection_attempts=1,
    )
    session_user = os.environ.get("INSTAGRAM_SESSION_USER")
    session_file = os.environ.get("INSTAGRAM_SESSION_FILE")
    if session_user:
        loader.load_session_from_file(session_user, session_file)

    profile = instaloader.Profile.from_username(loader.context, username)
    videos = {}
    for source in (profile.get_reels, profile.get_posts):
        for post in itertools.islice(source(), 8):
            is_video = post.is_video or (
                post.typename == "GraphSidecar" and any(post.get_is_videos())
            )
            if is_video:
                videos[post.shortcode] = post

    if not videos:
        raise ValueError("No se encontraron videos ni reels recientes")

    newest = max(videos.values(), key=lambda post: post.date_utc)
    return {
        "id": newest.shortcode,
        "title": (newest.caption or "Nuevo video").strip()[:500],
        "url": f"https://www.instagram.com/p/{newest.shortcode}/",
        "thumbnail": newest.url,
        "publishedAt": newest.date_utc.isoformat(),
    }


if __name__ == "__main__":
    try:
        if len(sys.argv) != 2 or not sys.argv[1].replace("_", "").replace(".", "").isalnum():
            raise ValueError("Usuario de Instagram inválido")
        print(json.dumps(latest_video(sys.argv[1]), ensure_ascii=False))
    except Exception as exc:
        print(f"Instagram: {exc}", file=sys.stderr)
        sys.exit(1)
