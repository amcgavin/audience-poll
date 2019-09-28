from collections import Counter
from typing import List, MutableMapping, Optional

from subscriber import Subscriber


class Room(object):
    class VoteMutation(object):
        def __init__(self, vote_for=None, vote_against=None):
            self._vote_for = vote_for
            self._vote_against = vote_against

        def asdict(self):
            return {"vote_for": self._vote_for, "vote_against": self._vote_against}

    def __init__(self):
        self._prompt: str = ""
        self._responses: List[str] = []
        self._answers: MutableMapping[Subscriber, str] = {}
        self._subscribers: List[Subscriber] = []
        self._owner: Optional[Subscriber] = None

    def __str__(self):
        return f"[{self._prompt}]: {self._answers}"

    @property
    def prompt(self) -> str:
        return self._prompt

    @prompt.setter
    def prompt(self, value: str):
        self._prompt = value

    @property
    def responses(self) -> List[str]:
        return self._responses

    @responses.setter
    def responses(self, value: List[str]):
        self._responses = value

    @property
    def answers(self) -> Counter:
        return Counter(self._answers.values())

    @property
    def owner(self) -> Optional[Subscriber]:
        return self._owner

    @answers.deleter
    def answers(self):
        self._answers = {}

    def vote(self, subscriber: Subscriber, vote: str) -> Optional["VoteMutation"]:
        if vote not in self._responses:
            return None
        old_vote = self._answers.get(subscriber, None)
        self._answers[subscriber] = vote
        if old_vote == vote:
            return None
        return self.VoteMutation(vote_for=vote, vote_against=old_vote)

    def subscribe_user(self, subscriber: Subscriber):
        if self._owner is None:
            self._owner = subscriber

        self._subscribers.append(subscriber)
        return subscriber

    async def notify(self, action: dict):
        for subscriber in self._subscribers:
            await subscriber.notify(action)
