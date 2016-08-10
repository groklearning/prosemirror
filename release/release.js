const edit = require("../src/edit")
const model = require("../src/model")
const menu = require("../src/menu")
const inputrules = require("../src/inputrules")
const commands = require("../src/commands")
const history = require("../src/history")
const browserkeymap = require("browserkeymap")

module.exports = {
  edit: edit,
  model: model,
  menu: menu,
  inputrules: inputrules,
  commands: commands,
  history: history,
  Keymap: browserkeymap,
};
