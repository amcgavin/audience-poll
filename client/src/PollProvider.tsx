import * as React from 'react'
import WebSocketProvider, {MessageHandler, WebSocketProviderProps} from './WebSocket'

enum ActionTypes {
  RESET = 'reset',
  SET_PROMPT = 'set-prompt',
  SET_RESPONSES = 'set-responses',
  VOTE = 'vote',
}

interface ResetAction {
  type: ActionTypes.RESET
}

interface SetPromptAction {
  type: ActionTypes.SET_PROMPT
  prompt: string
}

interface SetResponsesAction {
  type: ActionTypes.SET_RESPONSES
  responses: string[]
}

interface VoteAction {
  type: ActionTypes.VOTE
  vote_for: string | null
  vote_against: string | null
}

export interface ApplicationState {
  prompt: string
  responses: string[]
  votes: {[key: string]: number}
}

const initialState: ApplicationState = {
  prompt: '',
  responses: [],
  votes: {},
}

const voteAction = (state: ApplicationState, action: VoteAction): ApplicationState => {
  const {vote_for, vote_against} = action
  const votes = {...state.votes}
  if (vote_for) {
    votes[vote_for] = (votes[vote_for] || 0) + 1
  }
  if (vote_against) {
    votes[vote_against] = (votes[vote_against] || 0) - 1
  }
  return {...state, ...votes}
}

const reducer = (
  state: ApplicationState,
  action: SetPromptAction | SetResponsesAction | VoteAction | ResetAction
): ApplicationState => {
  switch (action.type) {
    case ActionTypes.RESET:
      return {...state, votes: {}}
    case ActionTypes.VOTE:
      return voteAction(state, action)
    case ActionTypes.SET_RESPONSES:
      return {...state, responses: action.responses}
    case ActionTypes.SET_PROMPT:
      return {...state, prompt: action.prompt}
    default:
      return state
  }
}

export type Selector<T> = (state: ApplicationState) => T
type Subscriber = (state: ApplicationState) => void

type StateSubscribers = {
  state: ApplicationState
  addSubscriber: (subscriber: Subscriber) => void
  removeSubscriber: (subscriber: Subscriber) => void
}

const useSubscribers = () => {
  const subscribers = React.useRef<Subscriber[]>([])
  const addSubscriber = (subscriber: Subscriber) => {
    subscribers.current.push(subscriber)
  }
  const removeSubscriber = (subscriber: Subscriber) => {
    const position = subscribers.current.indexOf(subscriber)
    if (position !== -1) subscribers.current.splice(position, 1)
  }
  const notify = (state: ApplicationState) => {
    subscribers.current.forEach(subscriber => subscriber(state))
  }
  return {addSubscriber, removeSubscriber, notify}
}
const PollContext = React.createContext<React.MutableRefObject<StateSubscribers | undefined>>({
  current: {state: initialState, addSubscriber: () => {}, removeSubscriber: () => {}},
})

function useSelector<T>(selector: Selector<T>) {
  const [, forceRender] = React.useReducer(s => s + 1, 0)
  const {
    current: {state, addSubscriber, removeSubscriber},
  } = React.useContext(PollContext)
  const currentState = React.useRef<T>(selector(state))
  const subscriber = React.useCallback<Subscriber>(
    (state: ApplicationState) => {
      // check to see if the prevState was the same
      // if not, set them differently, force a rerender.
      selector(state)
    },
    [selector]
  )
  React.useEffect(() => {
    addSubscriber(subscriber)
    return () => {
      removeSubscriber(subscriber)
    }
  }, [subscriber])
  return currentState.current
}

const PollProvider: React.FC<WebSocketProviderProps> = ({
  url,
  children,
}: WebSocketProviderProps) => {
  const stableState = React.useRef<StateSubscribers>()
  const [state, dispatch] = React.useReducer(reducer, initialState)
  const {addSubscriber, removeSubscriber, notify} = useSubscribers()
  stableState.current = {state, addSubscriber, removeSubscriber}
  notify(state)
  const onMessage = React.useCallback<MessageHandler>(
    message => {
      dispatch(JSON.parse(message.data))
    },
    [dispatch]
  )
  return (
    <WebSocketProvider url={url} onMessage={onMessage}>
      <PollContext.Provider value={stableState}>{children}</PollContext.Provider>
    </WebSocketProvider>
  )
}

export default PollProvider
