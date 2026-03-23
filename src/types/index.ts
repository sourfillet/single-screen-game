export interface DPadState {
  up: boolean
  down: boolean
  left: boolean
  right: boolean
}

export interface ObstacleDef {
  x: number
  y: number
  w: number
  h: number
  color?: number
}

export interface RoomDef {
  width: number
  height: number
  obstacles: ObstacleDef[]
}
