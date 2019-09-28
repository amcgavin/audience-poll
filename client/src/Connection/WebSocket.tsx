import * as React from 'react'

export interface WebSocketProviderProps {
  url: string
  children: React.ReactChildren
}

export type WebSocketSend = (message: string) => void

const WebSocketContext = React.createContext<WebSocket | undefined>(undefined)

export const useWebSocket = (): WebSocket | undefined => {
  return React.useContext<WebSocket | undefined>(WebSocketContext)
}

export const useSend = (): WebSocketSend => {
  const webSocket = useWebSocket()
  return React.useCallback<WebSocketSend>(
    (message: string) => {
      if (webSocket) webSocket.send(message)
    },
    [webSocket]
  )
}

export type WebSocketStateConsumer = (message: object) => void

export const useWebSocketState = (dispatcher: WebSocketStateConsumer) => {
  const webSocket = useWebSocket()
  React.useEffect(() => {
    const listener = (event: MessageEvent) => {
      dispatcher(JSON.parse(event.data))
    }
    if (webSocket) {
      webSocket.addEventListener('message', listener)
    }
    return () => {
      if (webSocket) {
        webSocket.removeEventListener('message', listener)
      }
    }
  }, [webSocket, dispatcher])
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({url, children}) => {
  const websocket = React.useRef<WebSocket>()
  React.useEffect(() => {
    const socket = new WebSocket(url)
    websocket.current = socket
    return () => {
      socket.close()
    }
  }, [url])
  return <WebSocketContext.Provider value={websocket.current}>{children}</WebSocketContext.Provider>
}

export default WebSocketProvider
