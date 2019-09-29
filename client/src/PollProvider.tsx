import * as React from 'react'
import WebSocketProvider, {useWebSocketState, WebSocketProviderProps} from './WebSocket'

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

interface ChangeListener<T> {
  update: (state: T) => void
  selector: Selector<T>
}

interface PollContextValue {
  state: ApplicationState
  listeners: ChangeListener<any>[]
}

const PollContext = React.createContext<PollContextValue>({state: initialState, listeners: []})

export function usePoll<T>(selector: Selector<T>) {
  /* This is causing rerenders every time the state changes. Not sure if it's because of setState bailing too late*/
  const {state, listeners} = React.useContext(PollContext)
  const [value, setValue] = React.useState<T>(selector(state))
  React.useEffect(() => {
    const listener = {update: setValue, selector}
    listeners.push(listener)
    return () => {
      const idx = listeners.indexOf(listener)
      if (idx !== -1) {
        listeners.splice(idx, 1)
      }
    }
  }, [listeners, selector])
  return value
}

const PollState: React.FC<{children: React.ReactNode}> = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const [state, dispatch] = React.useReducer(reducer, initialState)
  const ref = React.useRef<PollContextValue>({state, listeners: []})
  React.useEffect(() => {
    ref.current.listeners.forEach((listener: ChangeListener<any>) => {
      listener.update(listener.selector(state))
    })
  }, [state])
  useWebSocketState(dispatch)
  return <PollContext.Provider value={ref.current}>{children}</PollContext.Provider>
}

const PollProvider: React.FC<WebSocketProviderProps> = ({
  url,
  children,
}: WebSocketProviderProps) => (
  <WebSocketProvider url={url}>
    <PollState>{children}</PollState>
  </WebSocketProvider>
)

export default PollProvider
