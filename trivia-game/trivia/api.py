"""Thin client for the Open Trivia Database (https://opentdb.com/api_config.php).

No API key is required - OpenTDB is a fully public, keyless REST API. The one piece of
"authentication-like" state it uses is an optional session token (see TriviaClient),
which is not a secret - it's just an opaque id the server hands back so it can avoid
repeating a question you've already been served.
"""

import html
import random
import time
from dataclasses import dataclass, field

import requests

BASE_URL = "https://opentdb.com/api.php"
TOKEN_URL = "https://opentdb.com/api_token.php"

# OpenTDB response_code values.
OK = 0
NO_RESULTS = 1  # not enough questions exist for the given filters
TOKEN_NOT_FOUND = 3
TOKEN_EMPTY = 4  # session token has served every question available for these filters
RATE_LIMITED = 5  # more than 1 request per ~5s


class TriviaAPIError(RuntimeError):
    """Raised when Open Trivia DB can't satisfy a request after the retries below."""


@dataclass
class Question:
    category: str
    difficulty: str
    question: str
    correct_answer: str
    incorrect_answers: list[str]
    choices: list[str] = field(default_factory=list)

    def __post_init__(self):
        self.choices = self.incorrect_answers + [self.correct_answer]
        random.shuffle(self.choices)


class TriviaClient:
    """Fetches multiple-choice questions from Open Trivia DB, one difficulty tier at a time."""

    def __init__(self):
        self._token: str | None = None

    def _get_token(self) -> str | None:
        if self._token:
            return self._token
        try:
            resp = requests.get(TOKEN_URL, params={"command": "request"}, timeout=10)
            resp.raise_for_status()
            data = resp.json()
            if data.get("response_code") == OK:
                self._token = data["token"]
        except requests.RequestException:
            pass  # Game still works without a token, just risks repeat questions.
        return self._token

    def _reset_token(self) -> None:
        if self._token:
            try:
                requests.get(TOKEN_URL, params={"command": "reset", "token": self._token}, timeout=10)
            except requests.RequestException:
                pass

    def fetch(self, amount: int, difficulty: str, category_id: int | None) -> list[Question]:
        """Fetch `amount` multiple-choice questions of the given difficulty.

        Widens to "Any Category" if the chosen category doesn't have enough questions at
        this difficulty (response_code 1), and resets the session token and retries once
        if it's already served every matching question this session (response_code 4).
        """
        params = {"amount": amount, "difficulty": difficulty, "type": "multiple"}
        token = self._get_token()
        if token:
            params["token"] = token
        if category_id is not None:
            params["category"] = category_id

        data = self._request(params)

        if data["response_code"] == TOKEN_EMPTY and token:
            self._reset_token()
            params["token"] = self._get_token()
            data = self._request(params)

        if data["response_code"] == NO_RESULTS and category_id is not None:
            params.pop("category", None)
            data = self._request(params)

        if data["response_code"] != OK:
            raise TriviaAPIError(
                f"Open Trivia DB returned response_code={data['response_code']} "
                f"for difficulty={difficulty!r}, category={category_id!r}"
            )

        return [self._parse(r) for r in data["results"]]

    @staticmethod
    def _request(params: dict) -> dict:
        last_exc: Exception | None = None
        for attempt in range(3):
            try:
                resp = requests.get(BASE_URL, params=params, timeout=10)
                # OpenTDB rate-limits to ~1 request/5s, signalled either as an HTTP 429
                # (seen in practice) or a response_code 5 in the JSON body (per its docs).
                if resp.status_code == 429:
                    last_exc = TriviaAPIError("Open Trivia DB rate-limited this request (HTTP 429).")
                    if attempt < 2:
                        time.sleep(5.5)
                        continue
                    raise last_exc
                resp.raise_for_status()
                data = resp.json()
            except requests.RequestException as exc:
                raise TriviaAPIError(f"Could not reach Open Trivia DB: {exc}") from exc

            if data.get("response_code") == RATE_LIMITED and attempt < 2:
                time.sleep(5.5)
                continue
            return data
        raise last_exc

    @staticmethod
    def _parse(raw: dict) -> Question:
        unescape = html.unescape
        return Question(
            category=unescape(raw["category"]),
            difficulty=unescape(raw["difficulty"]),
            question=unescape(raw["question"]),
            correct_answer=unescape(raw["correct_answer"]),
            incorrect_answers=[unescape(a) for a in raw["incorrect_answers"]],
        )
