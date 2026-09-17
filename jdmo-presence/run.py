"""JDMO Presence - launcher (used by PyInstaller)."""

from jdmo_presence.app import JDMOPresence

if __name__ == "__main__":
    app = JDMOPresence()
    app.run()
