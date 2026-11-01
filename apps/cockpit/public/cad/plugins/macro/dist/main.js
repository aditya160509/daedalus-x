import _esm from "https://cdn.jsdelivr.net/npm/ace-builds@1.44.0/+esm";


var __webpack_modules__ = {};
// The module cache
var __webpack_module_cache__ = {};
// The require function
function __webpack_require__(moduleId) {
// Check if module is in cache
var cachedModule = __webpack_module_cache__[moduleId];
if (cachedModule !== undefined) {
return cachedModule.exports;
}
// Create a new module (and put it into the cache)
var module = (__webpack_module_cache__[moduleId] = {
exports: {}
});
// Execute the module function
__webpack_modules__[moduleId](module, module.exports, __webpack_require__);

// Return the exports of the module
return module.exports;
}
// expose the modules object (__webpack_modules__)
__webpack_require__.m = __webpack_modules__;

// webpack/runtime/esm_register_module
(() => {
__webpack_require__.add = function registerModules(modules) { Object.assign(__webpack_require__.m, modules) }

})();

__webpack_require__.add({
540(module) {
var exports = {
  "LM": "b57946628d90214e",
  "KE": "c59400cd67875c42",
  "Q$": "_787bcef21665732a",
  "nM": "_0d66580f283694d4",
  "FS": "e28a3d6067ef001d",
  "Gc": "_8252a1d3b6cf05d3",
  "mY": "fbb1d3d34782edcd",
  "o1": "_076a8f91e98391f3",
  "hP": "_7cdd247f703761ea",
  "G5": "fb38cf1c2ccc846e",
  "RZ": "_09f2b1331afdb329",
  "ZZ": "_7c9e5320113572a9",
  "NB": "_7667351d99b1174d",
  "hF": "_28c06b36f8b1f36c",
  "VK": "_850c4a3858879d3b",
};

module.exports = exports;


},
});
const external_Chili3dCore_namespaceObject = Chili3dCore;
const external_Chili3dElement_namespaceObject = Chili3dElement;

// Part of the Chili3d Project, under the AGPL-3.0 License.
// See LICENSE file in the project root for full license information.

async function runMacro(app, code) {
    if (!code.trim()) {
        external_Chili3dCore_namespaceObject.PubSub["default"].pub("showToast", "macro.editor.emptyCode");
        return;
    }
    const fn = new Function("app", code);
    await Promise.try(fn, app).then(()=>{
        external_Chili3dCore_namespaceObject.PubSub["default"].pub("showToast", "macro.editor.executed");
    }).catch((error)=>{
        console.error("Macro execution error:", error);
        alert(`macro.editor.error: ${error.message}`);
    });
}

const macro_module = __webpack_require__("540");
// Part of the Chili3d Project, under the AGPL-3.0 License.
// See LICENSE file in the project root for full license information.
//@ts-expect-error





const DefaultCode = `// Available variables:
// app - IApplication instance
// You can access:
//   - app.activeView - current active view
//   - app.documents - all open documents
//   - app.visualFactory - visual factory
//   - app.storage - storage interface
//   - shapeFactory - shape factory

// Example: Create a simple box

// const { Plane, EditableShapeNode } = Chili3dCore;
// const { document, cameraController } = app.activeView;
// 
// const box = shapeFactory.box(Plane.XY, 1000, 1000, 1000);
// const node = new EditableShapeNode({
//     document, 
//     name: "box1",
//     shape: box
// });
// document.modelManager.addNode(node);
// cameraController.fitContent();
// document.visual.update();

alert("Hello from macro!");
`;
class MacroEditor extends HTMLElement {
    app;
    storage;
    macro;
    onSaveCallback;
    nameInput = null;
    codeTextarea = null;
    editor;
    constructor(app, storage){
        super(), this.app = app, this.storage = storage;
    }
    show(macro, onSave) {
        this.macro = macro;
        this.onSaveCallback = onSave;
        const dom = this.createDom(macro);
        this.embeddingEditor();
        external_Chili3dCore_namespaceObject.PubSub["default"].pub("showDialog", macro ? "macro.editor.titleEdit" : "macro.editor.titleNew", dom, this.buttons());
    }
    embeddingEditor() {
        _esm.config.set("basePath", "https://cdn.jsdelivr.net/npm/ace-builds@1.44.0/src-min-noconflict");
        this.editor = _esm.edit(this.codeTextarea, {
            mode: "ace/mode/javascript",
            selectionStyle: "text"
        });
        this.editor?.setTheme(this.isDarkTheme() ? "ace/theme/dracula" : "ace/theme/xcode");
    }
    isDarkTheme() {
        const themeMode = external_Chili3dCore_namespaceObject.Config.instance.themeMode;
        let theme;
        if (themeMode === "system") {
            theme = window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
        } else {
            theme = themeMode;
        }
        return theme === "dark";
    }
    buttons() {
        return [
            {
                content: "macro.editor.run",
                onclick: async ()=>await runMacro(this.app, this.editor?.getValue() ?? ""),
                shouldClose: ()=>false
            },
            {
                content: "common.confirm",
                shouldClose: ()=>!!this.nameInput?.value.trim(),
                onclick: async ()=>await this.saveMacro()
            },
            {
                content: "common.cancel"
            }
        ];
    }
    createDom(macro) {
        this.nameInput = (0,external_Chili3dElement_namespaceObject.input)({
            className: macro_module.hF,
            value: macro?.name ?? "",
            placeholder: external_Chili3dCore_namespaceObject.I18n.translate("macro.editor.namePlaceholder")
        });
        this.codeTextarea = (0,external_Chili3dElement_namespaceObject.div)({
            id: "macro-editor-code",
            className: macro_module.VK,
            textContent: macro?.code ?? DefaultCode,
            onkeydown: (e)=>{
                if (e.key === "Enter") {
                    e.stopPropagation();
                }
            }
        });
        return (0,external_Chili3dElement_namespaceObject.div)({
            className: macro_module.RZ
        }, (0,external_Chili3dElement_namespaceObject.div)({
            className: macro_module.ZZ
        }, (0,external_Chili3dElement_namespaceObject.label)({
            className: macro_module.NB,
            textContent: new external_Chili3dCore_namespaceObject.Localize("macro.editor.name")
        }), this.nameInput), (0,external_Chili3dElement_namespaceObject.div)({
            className: macro_module.ZZ
        }, (0,external_Chili3dElement_namespaceObject.label)({
            className: macro_module.NB,
            textContent: new external_Chili3dCore_namespaceObject.Localize("macro.editor.code")
        }), this.codeTextarea));
    }
    async saveMacro() {
        const name = this.nameInput?.value.trim();
        if (!name) {
            alert(external_Chili3dCore_namespaceObject.I18n.translate("macro.editor.nameRequired"));
            return;
        }
        const code = this.editor?.getValue() ?? "";
        await this.storage.saveMacro(name, code, this.macro?.id);
        this.onSaveCallback?.();
    }
}
customElements.define("macro-editor", MacroEditor);

// Part of the Chili3d Project, under the AGPL-3.0 License.
// See LICENSE file in the project root for full license information.
const MACRO_DB = "chili3d-macros";
const MACRO_TABLE = "macros";
function generateId() {
    return `macro_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
class MacroStorage {
    app;
    constructor(app){
        this.app = app;
    }
    async ensureStorage() {
        const storage = this.app.storage;
        await storage.createDBIfNeeded(MACRO_DB, [
            MACRO_TABLE
        ]);
    }
    async getAllMacros() {
        const storage = this.app.storage;
        const page = await storage.page(MACRO_DB, MACRO_TABLE, 0);
        return page;
    }
    async getMacro(id) {
        const storage = this.app.storage;
        return await storage.get(MACRO_DB, MACRO_TABLE, id);
    }
    async saveMacro(name, code, existingId) {
        const storage = this.app.storage;
        const now = Date.now();
        let macro;
        if (existingId) {
            const existing = await this.getMacro(existingId);
            macro = {
                id: existingId,
                name,
                code,
                createdAt: existing?.createdAt ?? now,
                updatedAt: now
            };
        } else {
            macro = {
                id: generateId(),
                name,
                code,
                createdAt: now,
                updatedAt: now
            };
        }
        await storage.put(MACRO_DB, MACRO_TABLE, macro.id, macro);
        return macro;
    }
    async deleteMacro(id) {
        const storage = this.app.storage;
        return storage.delete(MACRO_DB, MACRO_TABLE, id);
    }
}

// Part of the Chili3d Project, under the AGPL-3.0 License.
// See LICENSE file in the project root for full license information.






class MacroManager {
    app;
    storage;
    macros = [];
    macroListElement = null;
    constructor(app){
        this.app = app;
        this.storage = new MacroStorage(app);
    }
    async initialize() {
        await this.storage.ensureStorage();
    }
    async show() {
        this.macros = await this.storage.getAllMacros();
        this.macroListElement = (0,external_Chili3dElement_namespaceObject.ul)({
            className: macro_module.nM
        });
        this.refreshList();
        const content = (0,external_Chili3dElement_namespaceObject.div)({
            className: macro_module.LM
        }, (0,external_Chili3dElement_namespaceObject.div)({
            className: macro_module.KE
        }, (0,external_Chili3dElement_namespaceObject.button)({
            textContent: new external_Chili3dCore_namespaceObject.Localize("macro.manager.new"),
            className: macro_module.Q$,
            onclick: ()=>this.createNewMacro()
        })), this.macroListElement);
        external_Chili3dCore_namespaceObject.PubSub["default"].pub("showFloatPanel", {
            title: "macro.manager.title",
            content,
            width: 500,
            height: 500
        });
    }
    createMacroItem(macro) {
        return (0,external_Chili3dElement_namespaceObject.li)({
            className: macro_module.Gc
        }, (0,external_Chili3dElement_namespaceObject.span)({
            className: macro_module.mY
        }, macro.name), (0,external_Chili3dElement_namespaceObject.div)({
            className: macro_module.o1
        }, (0,external_Chili3dElement_namespaceObject.button)({
            textContent: new external_Chili3dCore_namespaceObject.Localize("macro.manager.edit"),
            className: macro_module.hP,
            onclick: ()=>this.editMacro(macro)
        }), (0,external_Chili3dElement_namespaceObject.button)({
            textContent: new external_Chili3dCore_namespaceObject.Localize("macro.manager.run"),
            className: macro_module.hP,
            onclick: ()=>runMacro(this.app, macro.code)
        }), (0,external_Chili3dElement_namespaceObject.button)({
            textContent: new external_Chili3dCore_namespaceObject.Localize("macro.manager.delete"),
            className: `${macro_module.hP} ${macro_module.G5}`,
            onclick: ()=>this.deleteMacro(macro)
        })));
    }
    async createNewMacro() {
        const editor = new MacroEditor(this.app, this.storage);
        editor.show(undefined, async ()=>{
            this.macros = await this.storage.getAllMacros();
            this.refreshList();
        });
    }
    async editMacro(macro) {
        const editor = new MacroEditor(this.app, this.storage);
        editor.show(macro, async ()=>{
            this.macros = await this.storage.getAllMacros();
            this.refreshList();
        });
    }
    async deleteMacro(macro) {
        await this.storage.deleteMacro(macro.id);
        this.macros = this.macros.filter((m)=>m.id !== macro.id);
        this.refreshList();
    }
    refreshList() {
        if (!this.macroListElement) return;
        this.macroListElement.innerHTML = "";
        if (this.macros.length === 0) {
            this.macroListElement.appendChild((0,external_Chili3dElement_namespaceObject.li)({
                className: macro_module.FS,
                textContent: new external_Chili3dCore_namespaceObject.Localize("macro.manager.empty")
            }));
        } else {
            for (const macro of this.macros){
                this.macroListElement.appendChild(this.createMacroItem(macro));
            }
        }
    }
}

function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
// Macro Command - Entry point that opens the macro manager


class MacroCommand {
    async execute(application) {
        const manager = new MacroManager(application);
        await manager.initialize();
        await manager.show();
    }
}
MacroCommand = _ts_decorate([
    (0,external_Chili3dCore_namespaceObject.command)({
        key: "macro.open",
        icon: {
            type: "path",
            value: "icons/macro.svg"
        },
        helpText: "macro.description"
    })
], MacroCommand);

// Part of the Chili3d Project, under the AGPL-3.0 License.
// See LICENSE file in the project root for full license information.

const MacroPlugin = {
    commands: [
        MacroCommand
    ],
    ribbons: [
        {
            tabName: "ribbon.tab.plugin",
            groups: [
                {
                    groupName: "ribbon.group.plugin",
                    items: [
                        "macro.open"
                    ]
                }
            ]
        }
    ],
    i18nResources: [
        {
            language: "en",
            display: "English",
            translation: {
                "command.macro.open": "Macro",
                "macro.description": "Open macro manager",
                "macro.manager.title": "Macro Manager",
                "macro.manager.new": "New",
                "macro.manager.edit": "Edit",
                "macro.manager.run": "Run",
                "macro.manager.delete": "Delete",
                "macro.manager.empty": "No macros yet. Click New to create one.",
                "macro.manager.executed": "Macro executed successfully",
                "macro.manager.error": "Macro execution error: ",
                "macro.editor.titleNew": "New Macro",
                "macro.editor.titleEdit": "Edit Macro",
                "macro.editor.name": "Name:",
                "macro.editor.namePlaceholder": "Enter macro name",
                "macro.editor.code": "Code:",
                "macro.editor.codePlaceholder": "Enter your macro code here...",
                "macro.editor.run": "Run",
                "macro.editor.nameRequired": "Macro name is required",
                "macro.editor.emptyCode": "Macro code is empty",
                "macro.editor.executed": "Macro executed successfully",
                "macro.editor.error": "Execution error: "
            }
        },
        {
            language: "zh-CN",
            display: "简体中文",
            translation: {
                "command.macro.open": "宏",
                "macro.description": "打开宏管理器",
                "macro.manager.title": "宏管理器",
                "macro.manager.new": "新建",
                "macro.manager.edit": "编辑",
                "macro.manager.run": "运行",
                "macro.manager.delete": "删除",
                "macro.manager.empty": "暂无宏，点击新建创建",
                "macro.manager.executed": "宏执行成功",
                "macro.manager.error": "宏执行错误: ",
                "macro.editor.titleNew": "新建宏",
                "macro.editor.titleEdit": "编辑宏",
                "macro.editor.name": "名称:",
                "macro.editor.namePlaceholder": "输入宏名称",
                "macro.editor.code": "代码:",
                "macro.editor.codePlaceholder": "在此输入宏代码...",
                "macro.editor.run": "运行",
                "macro.editor.nameRequired": "宏名称不能为空",
                "macro.editor.emptyCode": "宏代码不能为空",
                "macro.editor.executed": "宏执行成功",
                "macro.editor.error": "执行错误: "
            }
        }
    ]
};
/* export default */ const src = (MacroPlugin);

export default src;
