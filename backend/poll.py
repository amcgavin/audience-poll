import asyncio
from typing import MutableMapping, Optional

import websockets
from actions import Action
from rooms import Room
from subscriber import Subscriber

MAX_ROOMS = 5
rooms: MutableMapping[str, Room] = {}


def get_room(path: str) -> Optional[Room]:
    if path in rooms:
        return rooms[path]

    if len(rooms) > MAX_ROOMS:
        return None
    rooms[path] = room = Room()
    return room


async def process_actions(subscriber: Subscriber, room: Room):
    async for message in subscriber.received_messages:
        action = Action.from_message(message, subscriber)
        if action:
            asyncio.get_event_loop().create_task(action.update_room(room))


async def create_subscriber(websocket: websockets.WebSocketServerProtocol, path: str):
    room = get_room(path)

    if not room:
        await websocket.close(reason="Room does not exist")
        return
    subscriber = Subscriber(websocket)
    room.subscribe_user(subscriber)
    asyncio.get_event_loop().create_task(process_actions(subscriber, room))
    asyncio.get_event_loop().create_task(subscriber.forward_actions())
    await websocket.wait_closed()


asyncio.get_event_loop().run_until_complete(websockets.serve(create_subscriber, "0.0.0.0", 8765))
asyncio.get_event_loop().run_forever()
