"""CustomTkinter UI: Home (settings) -> Loading -> Game -> End, all in one window."""

import threading
import time

import customtkinter as ctk

from .api import TriviaAPIError, TriviaClient
from .categories import CATEGORIES
from .game_logic import GameState
from .storage import load_high_score, save_high_score

# CustomTkinter defaults to drawing small icons (like the dropdown arrow) with a bundled
# icon font on non-macOS platforms; that font doesn't resolve its custom glyphs correctly
# on every system and shows up as a stray letter instead. Vector-drawn shapes render
# correctly everywhere, so force that mode instead.
ctk.DrawEngine.preferred_drawing_method = "polygon_shapes"

# ---- Palette: dark-blue "game show set" background with a gold accent. ----
BG = "#0a1330"
PANEL = "#101c44"
GOLD = "#f2c14e"
WHITE = "#f5f6fa"
MUTED = "#9aa5c9"
CORRECT = "#33c37f"
WRONG = "#e5484d"
DIFFICULTY_COLORS = {"easy": "#33c37f", "medium": "#f2994a", "hard": "#e5484d"}

QUESTION_COUNT_OPTIONS = ["10", "15", "20"]


def make_font(size: int, weight: str = "normal") -> ctk.CTkFont:
    # No explicit family: CTkFont falls back to CustomTkinter's bundled Roboto,
    # which renders consistently across OSes instead of depending on system fonts.
    return ctk.CTkFont(size=size, weight=weight)


class TriviaApp(ctk.CTk):
    """Root window. Owns the shared API client and swaps a single content frame."""

    def __init__(self):
        super().__init__()
        ctk.set_appearance_mode("dark")

        self.title("Trivia Game Show")
        self.geometry("980x680")
        self.minsize(780, 560)
        self.configure(fg_color=BG)

        self.client = TriviaClient()
        self.high_score = load_high_score()

        self._frame: ctk.CTkFrame | None = None
        self.show_home()

    def _swap(self, frame: ctk.CTkFrame) -> None:
        if self._frame is not None:
            self._frame.destroy()
        self._frame = frame
        self._frame.pack(fill="both", expand=True)

    def show_home(self) -> None:
        self._swap(HomeScreen(self, self))

    def start_game(self, amount: int, category_id: int | None) -> None:
        self._swap(LoadingScreen(self, self, amount, category_id))

    def show_game(self, game_state: GameState) -> None:
        self._swap(GameScreen(self, self, game_state))

    def show_error(self, message: str) -> None:
        self._swap(ErrorScreen(self, self, message))

    def show_end(self, prize: int, won: bool, correct_count: int, total: int) -> None:
        is_new_high = prize > self.high_score
        if is_new_high:
            self.high_score = prize
            save_high_score(prize)
        self._swap(EndScreen(self, self, prize, won, correct_count, total, is_new_high))


class HomeScreen(ctk.CTkFrame):
    def __init__(self, parent, app: TriviaApp):
        super().__init__(parent, fg_color=BG)
        self.app = app

        center = ctk.CTkFrame(self, fg_color="transparent")
        center.place(relx=0.5, rely=0.5, anchor="center")

        ctk.CTkLabel(
            center, text="★ TRIVIA GAME SHOW ★", font=make_font(34, "bold"), text_color=GOLD
        ).pack(pady=(0, 4))
        ctk.CTkLabel(
            center,
            text="Answer questions of rising difficulty — powered by the Open Trivia Database",
            font=make_font(14),
            text_color=MUTED,
        ).pack(pady=(0, 6))
        ctk.CTkLabel(
            center, text=f"High Score: ${app.high_score:,}", font=make_font(14, "bold"), text_color=WHITE
        ).pack(pady=(0, 28))

        settings = ctk.CTkFrame(center, fg_color=PANEL, corner_radius=16)
        settings.pack(pady=10, padx=10, fill="x")

        ctk.CTkLabel(settings, text="Number of Questions", font=make_font(14, "bold"), text_color=WHITE).grid(
            row=0, column=0, sticky="w", padx=24, pady=(22, 6)
        )
        self.amount_var = ctk.StringVar(value="15")
        ctk.CTkSegmentedButton(
            settings, values=QUESTION_COUNT_OPTIONS, variable=self.amount_var, width=260
        ).grid(row=1, column=0, padx=24, pady=(0, 20), sticky="w")

        ctk.CTkLabel(settings, text="Category", font=make_font(14, "bold"), text_color=WHITE).grid(
            row=0, column=1, sticky="w", padx=24, pady=(22, 6)
        )
        self.category_var = ctk.StringVar(value="Any Category")
        ctk.CTkOptionMenu(
            settings,
            values=list(CATEGORIES.keys()),
            variable=self.category_var,
            width=260,
            fg_color="#1f2b5c",
            button_color="#1f2b5c",
            button_hover_color="#2a3a7a",
            dropdown_fg_color=PANEL,
        ).grid(row=1, column=1, padx=24, pady=(0, 20), sticky="w")

        settings.grid_columnconfigure(0, weight=1)
        settings.grid_columnconfigure(1, weight=1)

        ctk.CTkButton(
            center,
            text="PLAY",
            font=make_font(20, "bold"),
            fg_color=GOLD,
            hover_color="#d9a83a",
            text_color="#1a1300",
            corner_radius=14,
            width=220,
            height=52,
            command=self._play,
        ).pack(pady=(30, 0))

    def _play(self) -> None:
        amount = int(self.amount_var.get())
        category_id = CATEGORIES[self.category_var.get()]
        self.app.start_game(amount, category_id)


class LoadingScreen(ctk.CTkFrame):
    def __init__(self, parent, app: TriviaApp, amount: int, category_id: int | None):
        super().__init__(parent, fg_color=BG)
        self.app = app

        center = ctk.CTkFrame(self, fg_color="transparent")
        center.place(relx=0.5, rely=0.5, anchor="center")

        ctk.CTkLabel(
            center, text="Loading your questions…", font=make_font(20, "bold"), text_color=WHITE
        ).pack(pady=(0, 16))
        bar = ctk.CTkProgressBar(center, width=280, mode="indeterminate")
        bar.pack()
        bar.start()

        threading.Thread(target=self._fetch, args=(amount, category_id), daemon=True).start()

    def _fetch(self, amount: int, category_id: int | None) -> None:
        state = GameState(amount, category_id)
        try:
            for i, (size, difficulty) in enumerate(zip(state.tiers, ("easy", "medium", "hard"))):
                if size == 0:
                    continue
                if i > 0:
                    time.sleep(5.5)  # stay under OpenTDB's ~1 request/5s rate limit between tiers
                state.questions.extend(self.app.client.fetch(size, difficulty, category_id))
        except TriviaAPIError as exc:
            self.app.after(0, lambda: self.app.show_error(str(exc)))
            return
        self.app.after(0, lambda: self.app.show_game(state))


class ErrorScreen(ctk.CTkFrame):
    def __init__(self, parent, app: TriviaApp, message: str):
        super().__init__(parent, fg_color=BG)
        center = ctk.CTkFrame(self, fg_color="transparent")
        center.place(relx=0.5, rely=0.5, anchor="center")

        ctk.CTkLabel(center, text="Couldn't load questions", font=make_font(20, "bold"), text_color=WRONG).pack(
            pady=(0, 10)
        )
        ctk.CTkLabel(
            center, text=message, font=make_font(12), text_color=MUTED, wraplength=520, justify="center"
        ).pack(pady=(0, 24))
        ctk.CTkButton(center, text="Back to Home", command=app.show_home, fg_color=GOLD, text_color="#1a1300").pack()


class GameScreen(ctk.CTkFrame):
    def __init__(self, parent, app: TriviaApp, state: GameState):
        super().__init__(parent, fg_color=BG)
        self.app = app
        self.state = state
        self.correct_count = 0
        self.answer_buttons: list[ctk.CTkButton] = []
        self.locked = False

        top = ctk.CTkFrame(self, fg_color="transparent")
        top.pack(fill="x", padx=30, pady=(24, 0))

        self.progress_label = ctk.CTkLabel(top, font=make_font(14, "bold"), text_color=WHITE)
        self.progress_label.pack(side="left")

        self.difficulty_badge = ctk.CTkLabel(
            top, font=make_font(13, "bold"), corner_radius=10, width=90, height=28
        )
        self.difficulty_badge.pack(side="right")

        self.category_label = ctk.CTkLabel(top, font=make_font(14), text_color=MUTED)
        self.category_label.pack(side="right", padx=(0, 16))

        prize_row = ctk.CTkFrame(self, fg_color="transparent")
        prize_row.pack(fill="x", padx=30, pady=(6, 0))
        self.prize_label = ctk.CTkLabel(prize_row, font=make_font(22, "bold"), text_color=GOLD)
        self.prize_label.pack(side="left")
        self.banked_label = ctk.CTkLabel(prize_row, font=make_font(13), text_color=MUTED)
        self.banked_label.pack(side="left", padx=(16, 0))

        question_card = ctk.CTkFrame(self, fg_color=PANEL, corner_radius=18)
        question_card.pack(fill="x", padx=30, pady=24)
        self.question_label = ctk.CTkLabel(
            question_card,
            font=make_font(19, "bold"),
            text_color=WHITE,
            wraplength=860,
            justify="center",
        )
        self.question_label.pack(padx=30, pady=30)

        grid = ctk.CTkFrame(self, fg_color="transparent")
        grid.pack(fill="both", expand=True, padx=30)
        grid.grid_columnconfigure((0, 1), weight=1)
        grid.grid_rowconfigure((0, 1), weight=1)
        letters = ["A", "B", "C", "D"]
        for i in range(4):
            btn = ctk.CTkButton(
                grid,
                text="",
                font=make_font(15),
                fg_color=PANEL,
                hover_color="#1a2a63",
                text_color=WHITE,
                corner_radius=12,
                height=64,
                anchor="w",
                command=lambda i=i: self._on_answer(i),
            )
            btn.grid(row=i // 2, column=i % 2, sticky="nsew", padx=10, pady=10)
            self.answer_buttons.append(btn)
        self._letters = letters

        bottom = ctk.CTkFrame(self, fg_color="transparent")
        bottom.pack(fill="x", padx=30, pady=(0, 24))
        self.fifty_button = ctk.CTkButton(
            bottom,
            text="50:50",
            font=make_font(13, "bold"),
            fg_color="#2a3a7a",
            hover_color="#3a4d99",
            width=100,
            command=self._on_fifty_fifty,
        )
        self.fifty_button.pack(side="left")

        self._render_question()

    def _render_question(self) -> None:
        self.locked = False
        state = self.state
        q = state.current_question
        difficulty = state.difficulty_for_index(state.index)

        self.progress_label.configure(text=f"Question {state.index + 1} of {state.total_questions}")
        self.category_label.configure(text=q.category)
        self.difficulty_badge.configure(
            text=difficulty.upper(), fg_color=DIFFICULTY_COLORS[difficulty], text_color="#101020"
        )
        self.prize_label.configure(text=f"Playing for: ${state.current_prize:,}")
        self.banked_label.configure(text=f"Banked (safe): ${state.banked:,}")
        self.question_label.configure(text=q.question)

        self.fifty_button.configure(state="normal" if not state.fifty_fifty_used else "disabled")

        for i, btn in enumerate(self.answer_buttons):
            choice = q.choices[i]
            btn.configure(
                text=f"{self._letters[i]}) {choice}",
                fg_color=PANEL,
                state="normal",
            )
            btn._trivia_choice = choice  # stash for lookup on click

    def _on_fifty_fifty(self) -> None:
        if self.state.fifty_fifty_used or self.locked:
            return
        keep = set(self.state.use_fifty_fifty())
        for btn in self.answer_buttons:
            if btn._trivia_choice not in keep:
                btn.configure(state="disabled", text="")
        self.fifty_button.configure(state="disabled")

    def _on_answer(self, index: int) -> None:
        if self.locked:
            return
        self.locked = True
        chosen = self.answer_buttons[index]._trivia_choice
        correct = self.state.current_question.correct_answer
        is_correct = chosen == correct

        for btn in self.answer_buttons:
            btn.configure(state="disabled")
            if btn._trivia_choice == correct:
                btn.configure(fg_color=CORRECT)
            elif btn is self.answer_buttons[index]:
                btn.configure(fg_color=WRONG)

        self.after(1200, lambda: self._after_reveal(is_correct))

    def _after_reveal(self, is_correct: bool) -> None:
        if is_correct:
            self.correct_count += 1
            self.state.advance()
            if self.state.finished:
                self.app.show_end(self.state.ladder[-1], True, self.correct_count, self.state.total_questions)
            else:
                self._render_question()
        else:
            self.app.show_end(
                self.state.final_prize_on_loss, False, self.correct_count, self.state.total_questions
            )


class EndScreen(ctk.CTkFrame):
    def __init__(self, parent, app: TriviaApp, prize: int, won: bool, correct: int, total: int, is_new_high: bool):
        super().__init__(parent, fg_color=BG)

        center = ctk.CTkFrame(self, fg_color="transparent")
        center.place(relx=0.5, rely=0.5, anchor="center")

        headline = "★ You won the top prize! ★" if won else "Game Over"
        ctk.CTkLabel(center, text=headline, font=make_font(28, "bold"), text_color=GOLD).pack(pady=(0, 10))
        ctk.CTkLabel(center, text=f"${prize:,}", font=make_font(40, "bold"), text_color=WHITE).pack(pady=(0, 14))
        ctk.CTkLabel(
            center, text=f"Correct answers: {correct} of {total}", font=make_font(14), text_color=MUTED
        ).pack(pady=(0, 6))
        if is_new_high:
            ctk.CTkLabel(center, text="New high score!", font=make_font(14, "bold"), text_color=CORRECT).pack(
                pady=(0, 20)
            )
        else:
            ctk.CTkLabel(center, text="", height=20).pack()

        row = ctk.CTkFrame(center, fg_color="transparent")
        row.pack(pady=(10, 0))
        ctk.CTkButton(
            row, text="Play Again", font=make_font(15, "bold"), fg_color=GOLD, text_color="#1a1300",
            command=app.show_home, width=160, height=44,
        ).pack(side="left", padx=8)
        ctk.CTkButton(
            row, text="Quit", font=make_font(15), fg_color="#2a3a7a", width=120, height=44,
            command=app.destroy,
        ).pack(side="left", padx=8)
