// !! This module implements the ProseMirror editor. It contains
// functionality related to editing, selection, and integration with
// the browser. `ProseMirror` is the class you'll want to instantiate
// and interact with when using the editor.

export {ProseMirror} from "./main"
export {defineOption} from "./options"
export {Range, SelectionError} from "./selection"
export {MarkedRange} from "./range"
export {defineCommand, defineParamHandler, Command} from "./commands"

import Keymap from "browserkeymap"
export {Keymap}
