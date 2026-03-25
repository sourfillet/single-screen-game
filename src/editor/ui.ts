import { TOOLS, CATEGORIES, type ToolDef } from './tools'
import { exportJSON, importJSON, emptyRoom, type EditorRoom } from './state'
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

function buildPalette(ctx: EditorContext): void {
  const container = document.getElementById('palette')!
  container.innerHTML = ''

  const eraserBtn = document.createElement('button')
  eraserBtn.className = 'eraser-btn'
  eraserBtn.textContent = '✕ Eraser (right-click)'
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

function selectTool(tool: ToolDef, ctx: EditorContext): void {
  ctx.activeTool  = tool
  ctx.activeProps = {}
  for (const p of tool.props) ctx.activeProps[p.key] = p.default

  document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'))
  document.querySelector<HTMLElement>(`[data-tool-id="${tool.id}"]`)?.classList.add('active')

  buildProperties(ctx)
}

// ── Properties ─────────────────────────────────────────────────────────────

function buildProperties(ctx: EditorContext): void {
  const container = document.getElementById('properties')!
  container.innerHTML = ''

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
    inp.max     = '60'
    inp.value   = String(ctx.room[key])
    inp.id      = `room-${key}`
    inp.addEventListener('change', () => {
      ctx.room[key] = Math.max(5, Math.min(60, Number(inp.value)))
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
          // Sync room-size inputs
          const wInp = document.getElementById('room-width')  as HTMLInputElement | null
          const hInp = document.getElementById('room-height') as HTMLInputElement | null
          if (wInp) wInp.value = String(ctx.room.width)
          if (hInp) hInp.value = String(ctx.room.height)
          ctx.onChanged()
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
    window.open('/', '_blank')
  })

  addBtn('✕ New Room', 'danger', () => {
    if (!confirm('Clear everything and start a new room?')) return
    const fresh = emptyRoom(ctx.room.width, ctx.room.height)
    Object.assign(ctx.room, fresh)
    ctx.onChanged()
  })
}
