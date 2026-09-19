"""Entry point: run `python main.py` to open the Trivia Game Show window."""

from trivia.ui import TriviaApp


def main() -> None:
    app = TriviaApp()
    app.mainloop()


if __name__ == "__main__":
    main()
