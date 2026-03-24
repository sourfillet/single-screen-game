// Vite resolves these PNG imports to hashed URLs at build time.
// Add new sprite variants here and reference them by key in preload().
import player_front1         from '../sprites/placeholder/player_front1.png'
import player_front2         from '../sprites/placeholder/player_front2.png'
import player_back1          from '../sprites/placeholder/player_back1.png'
import player_back2          from '../sprites/placeholder/player_back2.png'
import player_right1         from '../sprites/placeholder/player_right1.png'
import player_right2         from '../sprites/placeholder/player_right2.png'
import player_front_shield1  from '../sprites/placeholder/player_front_shield1.png'
import player_front_shield2  from '../sprites/placeholder/player_front_shield2.png'
import player_back_shield1   from '../sprites/placeholder/player_back_shield1.png'
import player_back_shield2   from '../sprites/placeholder/player_back_shield2.png'
import player_right_shield1  from '../sprites/placeholder/player_right_shield1.png'
import player_right_shield2  from '../sprites/placeholder/player_right_shield2.png'

export const PLAYER_SPRITE_URLS: Record<string, string> = {
  player_front1,
  player_front2,
  player_back1,
  player_back2,
  player_right1,
  player_right2,
  player_front_shield1,
  player_front_shield2,
  player_back_shield1,
  player_back_shield2,
  player_right_shield1,
  player_right_shield2,
}
