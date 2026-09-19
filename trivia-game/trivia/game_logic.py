"""Millionaire-style progression rules: difficulty tiers, prize ladder, safe havens."""

import random
from dataclasses import dataclass, field

from .api import Question


def tier_sizes(total: int) -> tuple[int, int, int]:
    """Split `total` questions into three roughly-equal (easy, medium, hard) tiers."""
    base = total // 3
    remainder = total - base * 3
    sizes = [base, base, base]
    for i in range(remainder):
        sizes[i] += 1
    return sizes[0], sizes[1], sizes[2]


def build_ladder(total: int) -> list[int]:
    """Prize value for each question index, roughly 1.6x'ing each step like the real ladder."""
    ladder = []
    value = 100
    for _ in range(total):
        ladder.append(value)
        value = int(round(value * 1.6 / 50) * 50)
    return ladder


def safe_haven_indexes(total: int) -> tuple[int, int]:
    """0-based question indexes after which a correct answer banks the prize won so far."""
    easy, medium, _hard = tier_sizes(total)
    return easy - 1, easy + medium - 1


class GameState:
    """Tracks one playthrough: current question index, banked/current prize, lifeline use."""

    def __init__(self, total_questions: int, category_id: int | None):
        self.total_questions = total_questions
        self.category_id = category_id
        self.ladder = build_ladder(total_questions)
        self.havens = safe_haven_indexes(total_questions)
        self.tiers = tier_sizes(total_questions)
        self.index = 0
        self.banked = 0
        self.fifty_fifty_used = False
        self.questions: list[Question] = []

    def difficulty_for_index(self, index: int) -> str:
        easy, medium, _hard = self.tiers
        if index < easy:
            return "easy"
        if index < easy + medium:
            return "medium"
        return "hard"

    @property
    def current_question(self) -> Question:
        return self.questions[self.index]

    @property
    def current_prize(self) -> int:
        return self.ladder[self.index]

    @property
    def is_safe_haven(self) -> bool:
        return self.index in self.havens

    @property
    def finished(self) -> bool:
        return self.index >= self.total_questions

    def use_fifty_fifty(self) -> list[str]:
        """Return two options to keep on screen: the correct answer plus one random wrong one."""
        self.fifty_fifty_used = True
        q = self.current_question
        wrong_keep = random.choice(q.incorrect_answers)
        kept = [q.correct_answer, wrong_keep]
        random.shuffle(kept)
        return kept

    def advance(self) -> None:
        """Call after a correct answer: banks the prize at a safe haven, then moves on."""
        if self.is_safe_haven:
            self.banked = self.ladder[self.index]
        self.index += 1

    @property
    def final_prize_on_loss(self) -> int:
        return self.banked
