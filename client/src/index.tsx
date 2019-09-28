import * as React from 'react'

export interface Props {
  prop: string
}

const MyComponent: React.FC<Props> = () => {
  return <div>Component</div>
}

export default MyComponent
