"""JDMO Presence - Minimal login dialog using Tkinter."""

import tkinter as tk
from tkinter import messagebox


def prompt_login() -> tuple[str, str] | None:
    """
    Show a small login dialog.
    Returns (email, password) tuple, or None if cancelled.
    """
    result: tuple[str, str] | None = None

    root = tk.Tk()
    root.title("JDMO Presence — Login")
    root.resizable(False, False)
    root.eval("tk::PlaceWindow . center")

    # Lift window to front
    root.lift()
    root.attributes("-topmost", True)

    pad = {"padx": 12, "pady": 6}

    tk.Label(root, text="JDMO Presence", font=("Helvetica", 14, "bold")).grid(
        row=0, column=0, columnspan=2, pady=(16, 4)
    )
    tk.Label(root, text="Sign in to your account").grid(
        row=1, column=0, columnspan=2, pady=(0, 12)
    )

    tk.Label(root, text="Email").grid(row=2, column=0, sticky="e", **pad)
    email_var = tk.StringVar()
    email_entry = tk.Entry(root, textvariable=email_var, width=28)
    email_entry.grid(row=2, column=1, **pad)
    email_entry.focus()

    tk.Label(root, text="Password").grid(row=3, column=0, sticky="e", **pad)
    pass_var = tk.StringVar()
    tk.Entry(root, textvariable=pass_var, show="*", width=28).grid(
        row=3, column=1, **pad
    )

    def on_submit(_event=None):
        nonlocal result
        e = email_var.get().strip()
        p = pass_var.get()
        if not e or not p:
            messagebox.showwarning("Missing fields", "Please enter email and password.")
            return
        result = (e, p)
        root.destroy()

    def on_cancel():
        root.destroy()

    btn_frame = tk.Frame(root)
    btn_frame.grid(row=4, column=0, columnspan=2, pady=(4, 16))
    tk.Button(btn_frame, text="Cancel", width=10, command=on_cancel).pack(
        side="left", padx=6
    )
    tk.Button(btn_frame, text="Login", width=10, command=on_submit, default="active").pack(
        side="left", padx=6
    )

    root.bind("<Return>", on_submit)
    root.mainloop()
    return result


def prompt_2fa_code() -> str | None:
    """
    Show a small dialog asking for a 2FA verification code.
    Returns the code string, or None if cancelled.
    """
    result: str | None = None

    root = tk.Tk()
    root.title("JDMO Presence — 2FA Required")
    root.resizable(False, False)
    root.eval("tk::PlaceWindow . center")

    root.lift()
    root.attributes("-topmost", True)

    pad = {"padx": 12, "pady": 6}

    tk.Label(root, text="Two-Factor Authentication", font=("Helvetica", 14, "bold")).grid(
        row=0, column=0, columnspan=2, pady=(16, 4)
    )
    tk.Label(root, text="Enter the 6-digit code from your authenticator app.").grid(
        row=1, column=0, columnspan=2, pady=(0, 12)
    )

    tk.Label(root, text="Authenticator Code").grid(row=2, column=0, sticky="e", **pad)
    code_var = tk.StringVar()
    code_entry = tk.Entry(root, textvariable=code_var, width=12, justify="center")
    code_entry.grid(row=2, column=1, **pad)
    code_entry.focus()

    def on_submit(_event=None):
        nonlocal result
        c = code_var.get().strip()
        if not c:
            messagebox.showwarning("Missing code", "Please enter your 2FA code.")
            return
        result = c
        root.destroy()

    def on_cancel():
        root.destroy()

    btn_frame = tk.Frame(root)
    btn_frame.grid(row=3, column=0, columnspan=2, pady=(4, 16))
    tk.Button(btn_frame, text="Cancel", width=10, command=on_cancel).pack(
        side="left", padx=6
    )
    tk.Button(btn_frame, text="Verify", width=10, command=on_submit, default="active").pack(
        side="left", padx=6
    )

    root.bind("<Return>", on_submit)
    root.mainloop()
    return result
