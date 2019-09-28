import abc
import json
from json import JSONDecodeError
from typing import TYPE_CHECKING, List, Optional

if TYPE_CHECKING:
    from rooms import Room, Subscriber


class Action(abc.ABC):
    __action_name__ = None
    __subclass_map__ = {}

    class ClientAction(object):
        PERMISSION_ALL = "all"
        PERMISSION_OWNER = "owner"

        def __init__(self, action_name, permission=PERMISSION_ALL, **kwargs):
            self._permission = permission
            self._kwargs = {"type": action_name, **kwargs}

        def asdict(self) -> dict:
            return self._kwargs

    def __init__(self, caller=None, **kwargs):
        self.caller = caller
        self.kwargs = kwargs

    def __str__(self):
        return f"[{self.__action_name__}]: {self.kwargs}"

    @classmethod
    def register(cls, subclass: "Action"):
        cls.__subclass_map__[subclass.__action_name__] = subclass
        return subclass

    @classmethod
    def from_message(cls, message: str, caller: "Subscriber") -> Optional["Action"]:
        try:
            message: dict = json.loads(message)
        except JSONDecodeError:
            return None
        action_type = message.pop("type", None)
        if not action_type:
            return None
        subclass = cls.__subclass_map__.get(action_type, None)
        if not subclass:
            return None
        return subclass(caller=caller, **message)

    @abc.abstractmethod
    def mutate(self, room: "Room") -> Optional["ClientAction"]:
        pass

    def has_permission(self, room: "Room") -> bool:
        if room.owner == self.caller:
            return True
        return False

    async def update_room(self, room: "Room"):
        if not self.has_permission(room):
            return
        action = self.mutate(room)
        if action is not None:
            await room.notify(self.mutate(room))


@Action.register
class ResetAction(Action):
    __action_name__ = "reset"

    def mutate(self, room: "Room"):
        del room.answers
        return self.ClientAction(self.__action_name__)


@Action.register
class SetPromptAction(Action):
    __action_name__ = "set-prompt"

    def __init__(self, prompt=None, **kwargs):
        super(SetPromptAction, self).__init__(prompt=prompt, **kwargs)
        self.prompt: str = prompt

    def mutate(self, room: "Room"):
        room.prompt = self.prompt
        return self.ClientAction(self.__action_name__, prompt=self.prompt)


@Action.register
class SetResponsesAction(Action):
    __action_name__ = "set-responses"

    def __init__(self, responses=None, **kwargs):
        super(SetResponsesAction, self).__init__(responses=responses, **kwargs)
        self.responses: List[str] = responses

    def mutate(self, room: "Room"):
        room.responses = self.responses
        return self.ClientAction(self.__action_name__, responses=self.responses)


@Action.register
class VoteAction(Action):
    __action_name__ = "vote"

    def __init__(self, vote=None, **kwargs):
        super(VoteAction, self).__init__(vote=vote, **kwargs)
        self.vote = vote

    def mutate(self, room: "Room"):
        vote_mutation = room.vote(self.caller, self.vote)
        if not vote_mutation:
            return None
        return self.ClientAction(self.__action_name__, votes=vote_mutation)

    def has_permission(self, room: "Room") -> bool:
        return True
