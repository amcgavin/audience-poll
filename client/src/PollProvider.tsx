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

const PollProvider: React.FC<WebSocketProviderProps> = ({
  url,
  children,
}: WebSocketProviderProps) => {
  const [state, dispatch] = React.useReducer(reducer, initialState)
  const onMessage = React.useCallback<MessageHandler>(
    message => {
      dispatch(JSON.parse(message.data))
    },
    [dispatch]
  )
  return (
    <WebSocketProvider url={url} onMessage={onMessage}>
      {children}
    </WebSocketProvider>
  )
}

export default PollProvider
