import json
from asyncio import Queue
from typing import AsyncIterable

from websockets import WebSocketServerProtocol


class Subscriber(object):
    def __init__(self, websocket):
        self._websocket: WebSocketServerProtocol = websocket
        self._queue = Queue()

    @property
    async def _messages(self) -> AsyncIterable[str]:
        while True:
            yield json.dumps(await self._queue.get(), default=lambda o: o.asdict())

    @property
    async def received_messages(self) -> AsyncIterable[str]:
        async for message in self._websocket:
            yield message

    async def notify(self, message: dict):
        await self._queue.put(message)

    async def forward_actions(self):
        async for message in self._messages:
            await self._websocket.send(message)

    def __hash__(self):
        return hash(self._websocket)

    def __eq__(self, other):
        if not isinstance(other, Subscriber):
            return False
        return self._websocket == other._websocket
