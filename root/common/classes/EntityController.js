class EntityController {
    #table;
    #rowContainer;
    #rowTemplate;
    #toggleButtons;
    #entityName;
    #entitySetName;
    #entityCaption;
    #detailUrl;
    #listUrl;
    #editor;

    constructor(settings) {
        this.#entityName = settings.entityName;
        this.#entitySetName = settings.entitySetName;
        this.#entityCaption = settings.entityCaption;

        this.#detailUrl = settings.detailUrl || `/@/${this.#entityName}`;
        this.#listUrl = settings.listUrl || `/@/${this.#entitySetName}`;

        this.#editor = settings.editor;
        if (this.#editor) {
            this.#editor.find("#popupAccept").on("click", () => {
                Cpi.HidePopup(this.#editor);
            });
            this.#editor.find("#popupCancel").on("click", () => {
                Cpi.HidePopup(this.#editor);
            });
        }

        this.#table = settings.table;
        this.#rowTemplate = this.#table.find(".listRow").detach();
        //this.#rowTemplate = this.#table.find(".listRow").clone(true);

        // Initialize the scrolltable handler.
        const scrolltable = this.#table.scrolltable({
            stripe: true,
            setWidths: true,
            maxHeight: "auto"
        });

        this.#rowContainer = this.#table.find(".st-body-table");
        //this.#rowContainer.find(".listRow").remove();

        // Buttons
        settings.addButton.on("click", () => {
            this.onAddEntity();
        });
        settings.editButton.on("click", () => {
            this.onEditEntity();
        });
        settings.deleteButton.on("click", () => {
            this.onDeleteEntity();
        });

        this.#toggleButtons = settings.toggleButtons || [];
        this.#toggleButtons.push(settings.editButton);
        this.#toggleButtons.push(settings.deleteButton);
    }

    get selectedRow() {
        const selection = this.#rowContainer.find(".listRow_selected");
        return selection.length ? selection : undefined;
    }
    set selectedRow(row) {
        this.#rowContainer.find(".listRow_selected").removeClass("listRow_selected");
        if (row) {
            row.addClass("listRow_selected");
        }
        this.#syncToggleButtons();
    }

    /* Table Interface */
    refreshRows() {
        this._fetchEntitySet(
            (dataSet) => {
                this.setRows(dataSet);
            }
        );
    }

    setRows(dataSet) {
        this.#rowContainer.find("tbody").empty();

        for (const data of dataSet) {
            this.#appendRow(data);
        }

        this.#sortRows();

        this.#syncToggleButtons(false);
    }

    insertRow(data) {
        const row = this.#appendRow(data);
        this.selectedRow = row;

        this.#sortRows();
        this.#syncToggleButtons();

        row[0].scrollIntoView();
    }

    updateSelectedRow(data) {
        const row = this.selectedRow;
        if (row) {
            this.formatRow(row, data);
            this.#sortRows();
            row[0].scrollIntoView();
        }
    }

    removeSelectedRow() {
        const row = this.selectedRow;
        if (row) {
            row.detach();
            this.#syncToggleButtons();
        }
    }

    /* Housekeeping Interface */
    onAddEntity() {
        this.#showEditor(() => {

        });
    }

    onEditEntity() {
        if (!this.#editor) {
            return;
        }

        this.#showEditor();
    }

    onDeleteEntity() {
    }

    /*
    * Protected
    */
    _fetchEntity(id, success) {
        const api = new CpiApi;
        api.sendRequest({
            method: "GET",
            url: this.#listUrl,
            success: success
        });
    }

    _fetchEntitySet(success) {
        const api = new CpiApi;
        api.sendRequest({
            method: "GET",
            url: this.#listUrl,
            success: success
        });
    }

    /*
    * Private
    */
    #appendRow(data) {
        const row = this.#rowTemplate.clone(true);

        this.formatRow(row, data);

        row.on("click", () => {
            const current = this.selectedRow;
            this.selectedRow = (!current || (row[0] !== current[0])) ? row : undefined;
        });
        row.on("dblclick", () => {
            this.selectedRow = row;
            this.onEditEntity();
        });

        this.#rowContainer.append(row);

        return row;
    }

    #sortRows() {
        const items = this.#rowContainer.children().sort((lhs, rhs) => { return this.compareRows(lhs, rhs); });
        this.#rowContainer.append(items);        

		this.#table.find('.st-body-scroll>table>tbody>tr')
			.filter(':odd').addClass("st-tr-odd").end()
			.filter(':even').addClass("st-tr-even");

    }    

    #syncToggleButtons(enable) {
        enable = (enable === undefined) ? (this.selectedRow !== undefined) : enable;
        for (const current of this.#toggleButtons) {
            current.prop("disabled", !enable);
        }
    }

    #showEditor(accept) {
        if (!this.#editor) {
            return;
        }

        Cpi.ShowPopup(this.#editor);
    }
}