import potUrl from '../sprites/pot.png'
import potBreak1Url from '../sprites/pot-break-1.png'
import potBreak2Url from '../sprites/pot-break-2.png'
import potBreak3Url from '../sprites/pot-break-3.png'
import potBreak4Url from '../sprites/pot-break-4.png'
import potBreak5Url from '../sprites/pot-break-5.png'
import potBreak6Url from '../sprites/pot-break-6.png'
import potBreak7Url from '../sprites/pot-break-7.png'

export const POT_KEY       = 'pot'
export const POT_BREAK_ANIM = 'pot-break'

/** All image keys for pot break frames, in order. */
export const POT_BREAK_KEYS = [
  'pot-break-1', 'pot-break-2', 'pot-break-3', 'pot-break-4',
  'pot-break-5', 'pot-break-6', 'pot-break-7',
]

/** Map of all pot texture keys to their URLs, for use in preload(). */
export const POT_SPRITE_URLS: Record<string, string> = {
  [POT_KEY]:      potUrl,
  'pot-break-1':  potBreak1Url,
  'pot-break-2':  potBreak2Url,
  'pot-break-3':  potBreak3Url,
  'pot-break-4':  potBreak4Url,
  'pot-break-5':  potBreak5Url,
  'pot-break-6':  potBreak6Url,
  'pot-break-7':  potBreak7Url,
}
