import grassUrl           from '../tiles/grass.png'
import grassHoleUrl        from '../tiles/grass-hole.png'
import grassTileUrl        from '../tiles/grass-tile.png'
import branchesUrl         from '../tiles/branches.png'
import branchesLeavesUrl   from '../tiles/branches-leaves.png'
import leavesUrl           from '../tiles/leaves.png'
import bricksBluePng       from '../tiles/bricks-blue.png'
import grassBrownRockUrl   from '../tiles/grass-brown-rock.png'
import greyRockUrl         from '../tiles/grey-rock.png'
import greyTileFloorUrl    from '../tiles/grey-tile-floor.png'

export interface TilePaletteEntry {
  key:   string
  label: string
  url:   string
}

export const TILE_PALETTE: TilePaletteEntry[] = [
  { key: 'tile_grass',            label: 'Grass',         url: grassUrl           },
  { key: 'tile_grass_hole',       label: 'Grass Hole',    url: grassHoleUrl       },
  { key: 'tile_grass_tile',       label: 'Grass Tile',    url: grassTileUrl       },
  { key: 'tile_branches',         label: 'Branches',      url: branchesUrl        },
  { key: 'tile_branches_leaves',  label: 'Branch+Leaves', url: branchesLeavesUrl  },
  { key: 'tile_leaves',           label: 'Leaves',        url: leavesUrl          },
  { key: 'tile_bricks_blue',      label: 'Blue Bricks',   url: bricksBluePng      },
  { key: 'tile_grass_rock',       label: 'Brown Rock',    url: grassBrownRockUrl  },
  { key: 'tile_grey_rock',        label: 'Grey Rock',     url: greyRockUrl        },
  { key: 'tile_grey_floor',       label: 'Grey Tile',     url: greyTileFloorUrl   },
]

export const TILE_PALETTE_URLS: Record<string, string> =
  Object.fromEntries(TILE_PALETTE.map(e => [e.key, e.url]))
