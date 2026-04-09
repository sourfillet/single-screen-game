import { TOOLS, CATEGORIES, toolForItem, type ToolDef } from './tools'
import { TILE_PALETTE } from '../assets/tilePalette'
import { exportJSON, importJSON, emptyRoom, updateItem, type EditorRoom } from './state'
import type { EditorContext } from './EditorScene'

export function buildUI(
  ctx: EditorContext,
  onResize: (w: number, h: number) => void,
): void {
  buildRoomSettings(ctx, onResize)
  buildPalette(ctx)
  buildProperties(ctx)
  buildActions(ctx)
}

// ── Palette ────────────────────────────────────────────────────────────────

export function buildPalette(ctx: EditorContext): void {
  const container = document.getElementById('palette')!
  container.innerHTML = ''

  // Mode switcher
  const modeRow = document.createElement('div')
  modeRow.className = 'mode-switcher'

  for (const mode of ['objects', 'tiles'] as const) {
    const btn = document.createElement('button')
    btn.className = `mode-btn${ctx.editorMode === mode ? ' active' : ''}`
    btn.textContent = mode === 'objects' ? 'Objects' : 'Tiles'
    btn.addEventListener('click', () => {
      ctx.editorMode = mode
      if (mode === 'objects') ctx.activeTileTexture = null
      buildPalette(ctx)
      buildProperties(ctx)
    })
    modeRow.appendChild(btn)
  }
  container.appendChild(modeRow)

  if (ctx.editorMode === 'tiles') {
    buildTilePalette(container, ctx)
  } else {
    buildObjectPalette(container, ctx)
  }
}

function buildObjectPalette(container: HTMLElement, ctx: EditorContext): void {
  const eraserBtn = document.createElement('button')
  eraserBtn.className = 'eraser-btn'
  eraserBtn.textContent = '✕ Eraser (right-click)'
  eraserBtn.addEventListener('click', () => {
    ctx.activeTool  = null
    ctx.activeProps = {}
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'))
    buildProperties(ctx)
  })
  container.appendChild(eraserBtn)

  for (const category of CATEGORIES) {
    const catDiv = document.createElement('div')
    catDiv.className = 'palette-category'
    catDiv.textContent = category
    container.appendChild(catDiv)

    for (const tool of TOOLS.filter(t => t.category === category)) {
      const btn = document.createElement('button')
      btn.className = 'tool-btn'
      btn.textContent = tool.label
      btn.dataset.toolId = tool.id
      btn.style.setProperty('--tool-color', tool.color)
      btn.style.borderLeftColor = tool.color
      btn.addEventListener('click', () => selectTool(tool, ctx))
      container.appendChild(btn)
    }
  }
}

function buildTilePalette(container: HTMLElement, ctx: EditorContext): void {
  // Layer selector
  const layerRow = document.createElement('div')
  layerRow.className = 'layer-row'

  for (const layer of ['base', 'top'] as const) {
    const btn = document.createElement('button')
    btn.className = `layer-btn${ctx.activeTileLayer === layer ? ' active' : ''}`
    btn.textContent = layer === 'base' ? 'Base' : 'Top'
    btn.title = layer === 'base'
      ? 'Permanent cosmetic layer'
      : 'Destructible layer (dig with shovel)'
    btn.addEventListener('click', () => {
      ctx.activeTileLayer = layer
      buildPalette(ctx)
      buildProperties(ctx)
    })
    layerRow.appendChild(btn)
  }
  container.appendChild(layerRow)

  // Eraser hint
  const eraserHint = document.createElement('div')
  eraserHint.className = 'eraser-btn'
  eraserHint.textContent = '✕ Erase tile (right-click)'
  container.appendChild(eraserHint)

  // Tile texture grid
  const tileGrid = document.createElement('div')
  tileGrid.className = 'tile-grid'

  for (const entry of TILE_PALETTE) {
    const btn = document.createElement('button')
    btn.className = `tile-btn${ctx.activeTileTexture === entry.key ? ' active' : ''}`
    btn.title = entry.label
    btn.dataset.tileKey = entry.key
    btn.style.backgroundImage = `url(${entry.url})`
    btn.addEventListener('click', () => {
      ctx.activeTileTexture = entry.key
      document.querySelectorAll('.tile-btn').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      buildProperties(ctx)
    })
    tileGrid.appendChild(btn)
  }
  container.appendChild(tileGrid)

  // Hidden pickup input (only for top layer)
  if (ctx.activeTileLayer === 'top') {
    const sep = document.createElement('div')
    sep.className = 'palette-category'
    sep.textContent = 'Hidden Pickup'
    container.appendChild(sep)

    const row = document.createElement('div')
    row.className = 'prop-row'
    const label = document.createElement('label')
    label.textContent = 'Type'
    const inp = document.createElement('input')
    inp.type = 'text'
    inp.placeholder = 'e.g. key'
    inp.value = ctx.activeTileHiddenPickup
    inp.addEventListener('input', () => { ctx.activeTileHiddenPickup = inp.value.trim() })
    row.appendChild(label)
    row.appendChild(inp)
    container.appendChild(row)
  }
}

function selectTool(tool: ToolDef, ctx: EditorContext): void {
  ctx.activeTool  = tool
  ctx.activeProps = {}
  ctx.selection   = null
  for (const p of tool.props) ctx.activeProps[p.key] = p.default

  document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'))
  document.querySelector<HTMLElement>(`[data-tool-id="${tool.id}"]`)?.classList.add('active')

  buildProperties(ctx)
}

// ── Properties ─────────────────────────────────────────────────────────────

export function buildProperties(ctx: EditorContext): void {
  const container = document.getElementById('properties')!
  container.innerHTML = ''

  // ── Tile mode ────────────────────────────────────────────────────────────
  if (ctx.editorMode === 'tiles') {
    const msg = document.createElement('div')
    msg.className = 'no-props'
    if (ctx.activeTileTexture) {
      const entry = TILE_PALETTE.find(e => e.key === ctx.activeTileTexture)
      msg.textContent = entry ? entry.label : ctx.activeTileTexture
      msg.style.color = '#ccc'
    } else {
      msg.textContent = 'Select a tile to paint'
    }
    container.appendChild(msg)
    return
  }

  // ── Selected item ────────────────────────────────────────────────────────
  if (ctx.selection) {
    const { field, index } = ctx.selection
    const arr = (ctx.room as unknown as Record<string, Record<string,unknown>[]>)[field]
    const item = arr?.[index]

    if (!item) {
      ctx.selection = null
      buildProperties(ctx)
      return
    }

    const tool = toolForItem(field, item)
    const props = tool?.props ?? []

    if (props.length === 0) {
      const msg = document.createElement('div')
      msg.className = 'no-props'
      msg.textContent = 'No editable properties'
      container.appendChild(msg)
      return
    }

    for (const prop of props) {
      const row = document.createElement('div')
      row.className = 'prop-row'
      const label = document.createElement('label')
      label.textContent = prop.label

      const currentVal = item[prop.key] ?? prop.default
      let input: HTMLElement

      if (prop.type === 'boolean') {
        const inp = document.createElement('input')
        inp.type    = 'checkbox'
        inp.checked = Boolean(currentVal)
        inp.addEventListener('change', () => {
          updateItem(ctx.room, field, index, { [prop.key]: inp.checked })
          ctx.onChanged()
        })
        input = inp
      } else if (prop.type === 'select' && prop.options) {
        const sel = document.createElement('select')
        for (const opt of prop.options) {
          const o = document.createElement('option')
          o.value = opt
          o.textContent = opt
          if (opt === String(currentVal)) o.selected = true
          sel.appendChild(o)
        }
        sel.addEventListener('change', () => {
          updateItem(ctx.room, field, index, { [prop.key]: sel.value })
          ctx.onChanged()
        })
        input = sel
      } else {
        const inp = document.createElement('input')
        inp.type  = prop.type === 'number' ? 'number' : 'text'
        inp.value = String(currentVal)
        inp.addEventListener('input', () => {
          const v = prop.type === 'number' ? Number(inp.value) : inp.value
          updateItem(ctx.room, field, index, { [prop.key]: v })
          ctx.onChanged()
        })
        input = inp
      }

      row.appendChild(label)
      row.appendChild(input)
      container.appendChild(row)
    }
    return
  }

  // ── Active tool ──────────────────────────────────────────────────────────
  if (!ctx.activeTool || ctx.activeTool.props.length === 0) {
    const msg = document.createElement('div')
    msg.className = 'no-props'
    msg.textContent = ctx.activeTool ? 'No properties' : 'Select a tool'
    container.appendChild(msg)
    return
  }

  for (const prop of ctx.activeTool.props) {
    const row = document.createElement('div')
    row.className = 'prop-row'

    const label = document.createElement('label')
    label.textContent = prop.label

    let input: HTMLElement

    if (prop.type === 'boolean') {
      const inp = document.createElement('input')
      inp.type    = 'checkbox'
      inp.checked = Boolean(prop.default)
      inp.addEventListener('change', () => { ctx.activeProps[prop.key] = inp.checked })
      input = inp
    } else if (prop.type === 'select' && prop.options) {
      const sel = document.createElement('select')
      for (const opt of prop.options) {
        const o    = document.createElement('option')
        o.value    = opt
        o.textContent = opt
        if (opt === String(prop.default)) o.selected = true
        sel.appendChild(o)
      }
      sel.addEventListener('change', () => { ctx.activeProps[prop.key] = sel.value })
      input = sel
    } else {
      const inp = document.createElement('input')
      inp.type  = prop.type === 'number' ? 'number' : 'text'
      inp.value = String(prop.default)
      inp.addEventListener('input', () => {
        ctx.activeProps[prop.key] = prop.type === 'number' ? Number(inp.value) : inp.value
      })
      input = inp
    }

    row.appendChild(label)
    row.appendChild(input)
    container.appendChild(row)
  }
}

// ── Room settings ──────────────────────────────────────────────────────────

function buildRoomSettings(ctx: EditorContext, onResize: (w: number, h: number) => void): void {
  const container = document.getElementById('room-settings')!
  container.innerHTML = ''

  const addRow = (labelText: string, key: 'width' | 'height') => {
    const row   = document.createElement('div')
    row.className = 'room-row'
    const label = document.createElement('label')
    label.textContent = labelText
    const inp   = document.createElement('input')
    inp.type    = 'number'
    inp.min     = '5'
    inp.max     = '200'
    inp.value   = String(ctx.room[key])
    inp.id      = `room-${key}`
    inp.addEventListener('change', () => {
      ctx.room[key] = Math.max(5, Math.min(200, Number(inp.value)))
      inp.value = String(ctx.room[key])
      onResize(ctx.room.width, ctx.room.height)
    })
    row.appendChild(label)
    row.appendChild(inp)
    container.appendChild(row)
  }

  addRow('Width (tiles)', 'width')
  addRow('Height (tiles)', 'height')
}

// ── Actions ────────────────────────────────────────────────────────────────

function buildActions(ctx: EditorContext): void {
  const container = document.getElementById('actions')!
  container.innerHTML = ''

  const addBtn = (text: string, className: string, onClick: () => void) => {
    const btn = document.createElement('button')
    btn.className = `action-btn ${className}`
    btn.textContent = text
    btn.addEventListener('click', onClick)
    container.appendChild(btn)
    return btn
  }

  addBtn('⬇ Export JSON', '', () => {
    const blob = new Blob([exportJSON(ctx.room)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'level.json'
    a.click()
  })

  const copyBtn = addBtn('⎘ Copy JSON', '', async () => {
    await navigator.clipboard.writeText(exportJSON(ctx.room))
    copyBtn.textContent = '✓ Copied!'
    setTimeout(() => { copyBtn.textContent = '⎘ Copy JSON' }, 1500)
  })

  addBtn('⬆ Import JSON', '', () => {
    const inp = document.createElement('input')
    inp.type   = 'file'
    inp.accept = '.json'
    inp.addEventListener('change', () => {
      const file = inp.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = e => {
        try {
          const imported = importJSON(e.target!.result as string)
          Object.assign(ctx.room, imported)
          ctx.selection = null
          // Sync room-size inputs
          const wInp = document.getElementById('room-width')  as HTMLInputElement | null
          const hInp = document.getElementById('room-height') as HTMLInputElement | null
          if (wInp) wInp.value = String(ctx.room.width)
          if (hInp) hInp.value = String(ctx.room.height)
          ctx.onChanged()
          ctx.refreshProps()
        } catch {
          alert('Could not parse JSON')
        }
      }
      reader.readAsText(file)
    })
    inp.click()
  })

  addBtn('▶ Play', 'play', () => {
    localStorage.setItem('editorPreviewRoom', exportJSON(ctx.room))
    window.open(import.meta.env.BASE_URL, '_blank')
  })

  addBtn('✕ New Room', 'danger', () => {
    if (!confirm('Clear everything and start a new room?')) return
    const fresh = emptyRoom(ctx.room.width, ctx.room.height)
    Object.assign(ctx.room, fresh)
    ctx.selection = null
    ctx.onChanged()
    ctx.refreshProps()
  })
}
