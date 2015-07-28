import {style, rangeHasStyle, Span, Node, nodeTypes, Pos} from "../model"
import {canLift, canWrap, joinPoint} from "../transform"
import {elt} from "../dom"
import {MenuItem} from "./menu"
import insertCSS from "insert-css"
import "./icons"

const tags = Object.create(null)

export function registerItem(tag, item) {
  (tags[tag] || (tags[tag] = [])).push(item)
}
export function getItems(tag) {
  return tags[tag] || []
}

export class IconItem extends MenuItem {
  constructor(icon, title) {
    super()
    this.icon = icon
    this.title = title
  }

  active() { return false }

  render(menu) {
    let iconClass = "ProseMirror-menuicon"
    if (this.active(menu.pm)) iconClass += " ProseMirror-menuicon-active"
    let dom = elt("div", {class: iconClass, title: this.title},
                  elt("span", {class: "ProseMirror-menuicon ProseMirror-icon-" + this.icon}))
    dom.addEventListener("mousedown", e => {
      e.preventDefault(); e.stopPropagation()
      menu.run(this.apply(menu.pm))
    })
    return dom
  }
}

export class LiftItem extends IconItem {
  constructor() {
    super("lift", "Move out of block")
  }
  select(pm) {
    let sel = pm.selection
    return canLift(pm.doc, sel.from, sel.to)
  }
  apply(pm) {
    let sel = pm.selection
    pm.apply(pm.tr.lift(sel.from, sel.to))
  }
}

export class JoinItem extends IconItem {
  constructor() {
    super("join", "Join with block above")
  }
  select(pm) {
    return joinPoint(pm.doc, pm.selection.head)
  }
  apply(pm) {
    pm.apply(pm.tr.join(joinPoint(pm.doc, pm.selection.head)))
  }
}

export class InsertBlockItem extends IconItem {
  constructor(icon, title, type, attrs) {
    super(icon, title)
    this.type = type
    this.attrs = attrs
  }
  select(pm) {
    let sel = pm.selection
    return Pos.samePath(sel.head.path, sel.anchor.path) &&
      pm.doc.path(sel.head.path).type.type == nodeTypes[this.type].type
  }
  apply(pm) {
    let sel = pm.selection, tr = pm.tr, off = 0
    if (sel.head.offset) {
      tr.split(sel.head)
      off = 1
    }
    pm.apply(tr.insert(sel.head.shorten(null, off), new Node(this.type, this.attrs)))
  }
}

export class WrapItem extends IconItem {
  constructor(icon, title, type) {
    super(icon, title)
    this.type = type
  }
  select(pm) {
    return canWrap(pm.doc, pm.selection.from, pm.selection.to, new Node(this.type))
  }
  apply(pm) {
    let sel = pm.selection
    pm.apply(pm.tr.wrap(sel.from, sel.to, new Node(this.type)))
  }
}

export class InlineStyleItem extends IconItem {
  constructor(icon, title, style, dialog) {
    super(icon, title)
    this.style = typeof style == "string" ? {type: style} : style
    this.dialog = dialog
  }
  active(pm) {
    let sel = pm.selection
    if (sel.empty)
      return style.containsType(pm.activeStyles(), this.style.type)
    else
      return rangeHasStyle(pm.doc, sel.from, sel.to, this.style.type)
  }
  apply(pm) {
    let sel = pm.selection
    if (this.active(pm)) {
      if (sel.empty)
        pm.setInlineStyle(this.style, false)
      else
        pm.apply(pm.tr.removeStyle(sel.from, sel.to, this.style.type))
    } else if (this.dialog) {
      return [this.dialog]
    } else {
      if (sel.empty)
        pm.setInlineStyle(this.style, true)
      else
        pm.apply(pm.tr.addStyle(sel.from, sel.to, this.style))
    }
  }
}

export class ImageItem extends IconItem {
  constructor() {
    super("image", "Insert image")
  }
  apply() { return [imageDialog] }
}

class DialogItem extends MenuItem {
  focus(form) {
    let input = form.querySelector("input, textarea")
    if (input) input.focus()
  }

  render(menu) {
    let form = this.form(menu.pm), done = false

    let finish = () => {
      if (!done) {
        done = true
        menu.pm.focus()
      }
    }

    let submit = () => {
      let result = this.apply(form, menu.pm)
      finish()
      menu.run(result)
    }
    form.addEventListener("submit", e => {
      e.preventDefault()
      submit()
    })
    form.addEventListener("keydown", e => {
      if (e.keyCode == 27) {
        finish()
        menu.leave()
      } else if (e.keyCode == 13 && !(e.ctrlKey || e.metaKey || e.shiftKey)) {
        e.preventDefault()
        submit()
      }
    })
    // FIXME too hacky?
    setTimeout(() => this.focus(form), 20)
    return form
  }
}

export class LinkDialog extends DialogItem {
  form() {
    return elt("form", null,
               elt("div", null, elt("input", {name: "href", type: "text", placeholder: "Target URL",
                                              size: 40, autocomplete: "off"})),
               elt("div", null, elt("input", {name: "title", type: "text", placeholder: "Title",
                                              size: 40, autocomplete: "off"})))
  }

  apply(form, pm) {
    let elts = form.elements
    if (!elts.href.value) return
    let sel = pm.selection
    pm.apply(pm.tr.addStyle(sel.from, sel.to, style.link(elts.href.value, elts.title.value)))
  }
}
const linkDialog = new LinkDialog

export class ImageDialog extends DialogItem {
  form(pm) {
    let alt = pm.selectedText
    return elt("form", null,
               elt("div", null, elt("input", {name: "src", type: "text", placeholder: "Image URL",
                                              size: 40, autocomplete: "off"})),
               elt("div", null, elt("input", {name: "alt", type: "text", value: alt, autocomplete: "off",
                                              placeholder: "Description / alternative text", size: 40})),
               elt("div", null, elt("input", {name: "title", type: "text", placeholder: "Title",
                                              size: 40, autcomplete: "off"})))
  }

  apply(form, pm) {
    let elts = form.elements
    if (!elts.src.value) return
    let sel = pm.selection, tr = pm.tr
    tr.delete(sel.from, sel.to)
    let attrs = {src: elts.src.value, alt: elts.alt.value, title: elts.title.value}
    pm.apply(tr.insertInline(sel.from, new Span("image", attrs, null, null)))
  }
}
const imageDialog = new ImageDialog

class SeparatorItem extends MenuItem {
  render() { return elt("div", {class: "ProseMirror-menuseparator"}) }
}
export const separatorItem = new SeparatorItem

class UndoItem extends IconItem {
  constructor() { super("undo", "Undo") }
  select(pm) { return pm.history.canUndo() }
  apply(pm) { pm.history.undo() }
}
class RedoItem extends IconItem {
  constructor() { super("redo", "Redo") }
  select(pm) { return pm.history.canRedo() }
  apply(pm) { pm.history.redo() }
}
class HistorySeparator extends SeparatorItem {
  select(pm) { return pm.history.canUndo() || pm.history.canRedo() }
}

registerItem("inline", new InlineStyleItem("strong", "Strong text", style.strong))
registerItem("inline", new InlineStyleItem("em", "Emphasized text", style.em))
registerItem("inline", new InlineStyleItem("link", "Hyperlink", "link", linkDialog))
registerItem("inline", new InlineStyleItem("code", "Code font", style.code))
registerItem("inline", new ImageItem("image"))

registerItem("block", new LiftItem)
registerItem("block", new WrapItem("list-ol", "Wrap in ordered list", "ordered_list"))
registerItem("block", new WrapItem("list-ul", "Wrap in bullet list", "bullet_list"))
registerItem("block", new WrapItem("quote", "Wrap in blockquote", "blockquote"))
registerItem("block", new InsertBlockItem("hr", "Insert horizontal rule", "horizontal_rule"))
registerItem("block", new JoinItem)

registerItem("history", new HistorySeparator)
registerItem("history", new UndoItem)
registerItem("history", new RedoItem)

// Awkward hack to force Chrome to initialize the font and not return
// incorrect size information the first time it is used.

let forced = false
export function forceFontLoad(pm) {
  if (forced) return
  forced = true

  let node = pm.wrapper.appendChild(elt("div", {class: "ProseMirror-menuicon ProseMirror-icon-strong",
                                                style: "visibility: hidden; position: absolute"}))
  window.setTimeout(() => pm.wrapper.removeChild(node), 20)
}

insertCSS(`

.ProseMirror-menuicon {
  display: inline-block;
  padding: 1px 4px;
  margin: 0 2px;
  cursor: pointer;
  text-rendering: auto;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  vertical-align: middle;
}

.ProseMirror-menuicon-active {
  background: #666;
  border-radius: 4px;
}

.ProseMirror-menuseparator {
  display: inline-block;
}
.ProseMirror-menuseparator:after {
  content: "︙";
  opacity: 0.5;
  padding: 0 4px;
  vertical-align: middle;
}

`)