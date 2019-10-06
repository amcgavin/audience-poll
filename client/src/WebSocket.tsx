import * as React from 'react'

export type MessageHandler = (message: MessageEvent) => void

export interface WebSocketProviderProps {
  url: string
  children: React.ReactNode
  onMessage: MessageHandler
}

export type WebSocketSend = (message: string) => void

const WebSocketContext = React.createContext<WebSocket | null>(null)

export const useWebSocket = (): WebSocket | null => {
  return React.useContext<WebSocket | null>(WebSocketContext)
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

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({
  url,
  children,
  onMessage,
}: WebSocketProviderProps) => {
  const [webSocket, setWebSocket] = React.useState<WebSocket | null>(null)
  React.useEffect(() => {
    const socket = new WebSocket(url)
    setWebSocket(socket)
    return () => {
      if (socket) socket.close()
    }
  }, [url])
  React.useEffect(() => {
    if (webSocket) {
      webSocket.addEventListener('message', onMessage)
    }
    return () => {
      if (webSocket) {
        webSocket.removeEventListener('message', onMessage)
      }
    }
  }, [webSocket, onMessage])
  return <WebSocketContext.Provider value={webSocket}>{children}</WebSocketContext.Provider>
}

export default WebSocketProvider
