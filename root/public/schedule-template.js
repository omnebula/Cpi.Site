

/*
* Template Manager
*/
class TemplateManager {
    #schedulePage;
    #templateSection;
    #templateDropdown;
    #templateContainer;
    #templateOptionTemplate;
    #savePopup;
    #managerPopup;

    constructor(schedulePage) {
        this.#schedulePage = schedulePage;

        this.#templateSection = $("#templateSection");
        this.#templateDropdown = this.#templateSection.find("#templateDropdown");
        this.#templateContainer = this.#templateDropdown.find("#templateOptionContainer");
        this.#templateOptionTemplate = this.#templateContainer.find(".templateOption").detach();

        this.#templateSection.on("mouseenter", () => {
            this.#openTemplateMenu();
        });

        this.#templateDropdown.find("#saveCurrentLayout").on("click", () => {
            this.#saveCurrentLayout();
        });
        this.#templateDropdown.find("#showTemplateManager").on("click", () => {
            this.#showTemplateManager();
        });

        this.#savePopup = new SavePopup(this);
        this.#managerPopup = new ManagerPopup(this);
    }

    get schedulePage() {
        return this.#schedulePage;
    }

    static FormatTemplateId(templateName) {
        return templateName.replace(/ /g, '-').replace(/\./g, '-');
    }

    show() {
        this.#templateSection.css("display", "inline-block");
    }
    hide() {
        this.#templateSection.css("display", "none");
    }

    #openTemplateMenu() {
        this.#templateContainer.empty();

        if (this.schedulePage.accountData.templates.schedule.length) {
            for (const templateName of this.schedulePage.accountData.templates.schedule) {
                const templateOption = this.#templateOptionTemplate.clone(true);
                templateOption.attr("id", templateName);
                templateOption
                    .text(templateName)
                    .on("click", () => {
                        this.#applyTemplate(templateOption.attr("id"));
                    });
                this.#templateContainer.append(templateOption);
            }

            this.#templateContainer.css("display", "block");
        }
        else {
            this.#templateContainer.css("display", "none");
        }

        this.#templateDropdown.css("display", "");
    }
    #closeTemplateMenu() {
        this.#templateDropdown.css("display", "none");
    }

    #saveCurrentLayout() {
        this.#closeTemplateMenu();
        this.#savePopup.show();
    }

    #applyTemplate(templateName) {
        this.#closeTemplateMenu();

        Cpi.SendApiRequest({
            method: "POST",
            url: `/@/lesson/schedule/template?action=apply&name=${templateName}&week=${this.schedulePage.weekNumber}`,
            success: (data) => {
                this.schedule
                this.schedulePage.refresh(data);
            }
        });
    }

    #showTemplateManager() {
        this.#closeTemplateMenu();
        this.#managerPopup.show();
    }
}


/*
* TemplatePopup
*/

class TemplatePopup {
    #templateManager;

    constructor(templateManager) {
        this.#templateManager = templateManager;
    }

    get templateManager() {
        return this.#templateManager;
    }
    get schedulePage() {
        return this.#templateManager.schedulePage;
    }
}


/*
* SavePopup
*/

class SavePopup extends TemplatePopup {
    #popup;
    #nameInput;
    #optionTable;

    constructor(templateManager) {
        super(templateManager);

        this.#popup = $("#saveTemplatePopup");
        this.#optionTable = new TemplateOptionTable(this.#popup.find("#templatePopupTable"));

        this.#nameInput = this.#popup.find("#templateNameInput");
        this.#nameInput.on("keydown", (event) => {
            if (event.keyCode === 13) {
                this.#popup.find("#popupAccept").trigger("click");
            }
        });
        this.#nameInput.on("focus", () => {
            this.#optionTable.selectedRow = null;
        });
    }

    show() {
        this.#nameInput.val("");

        const templates = this.schedulePage.accountData.templates.schedule;
        this.#optionTable.refresh(templates, (row, templateName) => {
            row.find("#templateName").text(templateName);

            row.on("click", () => {
                this.#nameInput.val(templateName);
            })
            .on("dblclick", () => {
                this.#popup.find("#popupAccept").trigger("click");
            });
        });
    
        Cpi.ShowPopup(
            this.#popup,
            () => {
                const templateName = this.#nameInput.val().trim();

                if (templateName !== "") {
                    Cpi.SendApiRequest({
                        method: "POST",
                        url: `/@/lesson/schedule/template?action=save&name=${templateName}&week=${this.schedulePage.weekNumber}`,
                        success: (data, status, xhr) => {
                            if (xhr.status == 201) { // Created, add to schedule templates.
                                this.schedulePage.accountData.templates.schedule.push(templateName);
                                this.schedulePage.persistAccountData();
                            }
                        }
                    });
                }
                else {
                    Cpi.ShowAlert({
                        message: "Please enter a template name.",
                        close: () => {
                            this.show();
                        }
                    });
                }
            }
        );
    }
}


/*
* ManagerPopup
*/
class ManagerPopup extends TemplatePopup {
    #popup;
    #table;
    #renameButton;
    #deleteButton;
    #moveUpButton;
    #moveDownButton;

    constructor(templateManager) {
        super(templateManager);

        this.#popup = $("#templateManagerPopup");
        this.#table = new TemplateOptionTable(this.#popup.find("#templatePopupTable"));

        this.#renameButton = this.#popup.find("#renameTemplate");
        this.#renameButton.on("click", () => {
            this.#renameTemplate();
        });

        this.#deleteButton = this.#popup.find("#deleteTemplate");
        this.#deleteButton.on("click", () => {
            this.#deleteTemplate();
        });

        this.#moveUpButton = this.#popup.find("#moveTemplateUp");
        this.#moveUpButton.on("click", () => {
            this.#moveTemplateUp();
        });

        this.#moveDownButton = this.#popup.find("#moveTemplateDown");
        this.#moveDownButton.on("click", () => {
            this.#moveTemplateDown();
        });
    }

    show() {
        var index = 0;
        this.#table.refresh(
            this.schedulePage.accountData.templates.schedule,
            (row, templateName) => {
                row.on("click", () => {
                    this.#syncButtons();
                });

                row.prop("templateIndex", index++);

                const nameInput = row.find("#templateName");
                nameInput.val(templateName)
                    .on("click", () => {
                        if (nameInput.is(":focus")) {
                            this.#commitRenameTemplate(row);
                        }
                    })
                    .on("dblclick", (event) => {
                        this.#table.selectedRow = row;
                        this.#renameButton.trigger("click");
                    })
                    .on("keydown", (event) => {
                        if (event.keyCode === 13) {
                            this.#commitRenameTemplate(row);
                        }
                        else if (event.keyCode === 27) {
                            this.#cancelEditMode(row);
                        }
                    })
                    .on("blur", () => {
                        if (!nameInput.prop("readonly")) {
                            this.#cancelEditMode(row);
                        }
                    });
            });

        this.#syncButtons();
    
        Cpi.ShowPopup(this.#popup);
    }

    #renameTemplate() {
        const selection = this.#getSelectedRow();
        if (selection) {
            const nameInput = selection.find("#templateName");
            nameInput
                .addClass("templateNameEditMode")
                .prop("readonly", false)
                .focus()
                .select();
        }
    }
    #commitRenameTemplate(selection) {
        const nameInput = selection.find("#templateName");

        const newName = nameInput.val();
        const newId = TemplateManager.FormatTemplateId(newName);

        // Check if already exists.
        const existing = this.#table.findRow(`#${newId}`);
        if (!existing.length) {

            const oldName = selection.attr("templateName");

            Cpi.SendApiRequest({
                method: "POST",
                url: `/@/lesson/schedule/template?action=rename&old=${oldName}&new=${newName}`,
                success: (data) => {
                    this.#disableEditMode(nameInput);

                    selection.attr("id", newId);
                    selection.attr("templateName", newName);

                    const scheduleTemplates = this.schedulePage.accountData.templates.schedule;
                    for (var index = 0; index < scheduleTemplates.length; index++) {
                        const current = scheduleTemplates[index];

                        if (current == oldName) {
                            scheduleTemplates[index] = newName;
                            break;
                        }
                    }
                    this.schedulePage.persistAccountData();
                }
            });
        }
        else if (existing[0] !== selection[0]) {
            Cpi.ShowAlert("A template with the same name already exists.");
        }
    }

    #deleteTemplate() {
        const selection = this.#getSelectedRow();
        if (selection) {
            const templateName = selection.find("#templateName").val();

            Cpi.SendApiRequest({
                method: "POST",
                url: `/@/lesson/schedule/template?action=delete&name=${templateName}`,
                success: () => {
                    selection.remove();

                    this.#syncButtons();

                    const scheduleTemplates = this.schedulePage.accountData.templates.schedule;
                    for (var index = 0; index < scheduleTemplates.length; index++) {
                        const current = scheduleTemplates[index];

                        if (current == templateName) {
                            scheduleTemplates.splice(index, 1);
                            break;
                        }
                    }
                    this.schedulePage.persistAccountData();
                }
            });
        }
    }

    #moveTemplateUp() {
        const selection = this.#getSelectedRow();
        if (selection) {
            this.#sendMoveRequest(selection, -1);
        }
    }
    #moveTemplateDown() {
        const selection = this.#getSelectedRow();
        if (selection) {
            this.#sendMoveRequest(selection, 1);
        }
    }
    #sendMoveRequest(selection, direction) {
        const selectedName = selection.find("#templateName").val();
        const target = direction < 0 ? selection.prev() : selection.next();

        var selectedIndex;
        const newTemplates = [];
        for (var index = 0; index < this.schedulePage.accountData.templates.schedule.length; ++index) {
            const templateName = this.schedulePage.accountData.templates.schedule[index];

            if (templateName === selectedName) {
                selectedIndex = index;
            }
            else {
                newTemplates.push(templateName);
            }
        }

        newTemplates.splice(selectedIndex + direction, 0, selectedName);

        Cpi.SendApiRequest({
            method: "POST",
            url: `/@/lesson/schedule/template?action=reorder`,
            data: JSON.stringify(newTemplates),
            success: () => {
                selection.detach();

                if (direction < 0) {
                    target.before(selection);
                }
                else {
                    target.after(selection);
                }

                this.schedulePage.accountData.templates.schedule = newTemplates;
                this.schedulePage.persistAccountData();
            }
        });
    }

    #syncButtons() {
        const container = this.#popup.find("#templatePopupRowContainer");
        const enableButtons = container.find(".templatePopupRow_selected").length > 0;
        this.#popup.find(".templatePopupButton").prop("disabled", !enableButtons);
    }

    #getSelectedRow() {
        const selection = this.#popup.find("#templatePopupRowContainer .templatePopupRow_selected");
        return selection.length === 1 ? selection : null;
    }

    #cancelEditMode(row) {
        const prevName = row.attr("templateName");
        const nameInput = row.find("#templateName");
        nameInput.val(prevName);
        this.#disableEditMode(nameInput);
    }
    #disableEditMode(nameInput) {
        nameInput.removeClass("templateNameEditMode");
        nameInput.prop("readonly", true);
    }
}


/*
* TemplateOptionTable
*/

class TemplateOptionTable {
    #table;
    #rowContainer;
    #rowTemplate;

    constructor(table) {
        this.#table = table;
        this.#rowContainer = this.#table.find("#templatePopupRowContainer");
        this.#rowTemplate = this.#rowContainer.find("#templatePopupRow").detach();
    }

    get selectedRow() {
        const selection = this.findRow(".templatePopupRow_selected");
        return selection.length === 1 ? selection : null;
    }
    set selectedRow(newSelection) {
        const curSelection = this.findRow(".templatePopupRow_selected");
        curSelection.removeClass("templatePopupRow_selected");

        if (newSelection) {
            if (newSelection[0] !== curSelection[0]) {
                newSelection.addClass("templatePopupRow_selected");
            }
        }
    }

    find(predicate) {
        return this.#table.find(predicate);
    }
    findRow(predicate) {
        return this.#rowContainer.find(predicate);
    }

    refresh(templates, format) {
        this.#rowContainer.empty();

        for (const templateName of templates) {
            const row = this.#rowTemplate.clone(true);

            row.attr("id", TemplateManager.FormatTemplateId(templateName));
            row.attr("templateName", templateName);
            row.on("click", () => {
                this.selectedRow = row;
            });

            if (format) {
                format(row, templateName);
            }

            this.#rowContainer.append(row);
        }
    }

    remove(selection) {
        if (typeof(selection) === "string") {
            selection = this.#rowContainer.find(selection);
        }
        selection.remove();
    }
}
