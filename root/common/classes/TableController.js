

class TableController {
    #entityBroker;
    #dataTable;
    #toggleButtons;
    #entityCaption;
    #editor;
    #enableSelect = true;

    constructor(params) {
        this.#entityBroker = params.entityBroker;

        this.#entityCaption = params.entityCaption;
        this.#editor = params.editor;

        this.#dataTable = new DataTable(params.table);

        // Buttons
        this.#toggleButtons = params.toggleButtons || [];

        if (params.addButton) {
            params.addButton.on("click", () => {
                this.onAddEntity();
            });
        }
        if (params.editButton) {
            params.editButton.on("click", () => {
                this.onEditEntity();
            });
            this.#toggleButtons.push(params.editButton);
        }
        if (params.deleteButton) {
            params.deleteButton.on("click", () => {
                this.onDeleteEntity();
            });
            this.#toggleButtons.push(params.deleteButton);
        }

    }

    get dataTable() {
        return this.#dataTable;
    }

    get entityBroker() {
        return this.#entityBroker;
    }

    get editor() {
        return this.#editor;
    }

    get enableSelect() {
        return this.#enableSelect;
    }
    set enableSelect(enable) {
        this.#enableSelect = enable;
    }

    getRows() {
        return this.#dataTable.rows;
    }

    getSelectedRow() {
        const selection = this.#dataTable.findRows(".listRow_selected");
        return selection.length ? selection : undefined;
    }
    setSelectedRow(row, scrollIntoView) {
        this.#dataTable.findRows(".listRow_selected").removeClass("listRow_selected");
        if (row) {
            row.addClass("listRow_selected");

            if (scrollIntoView) {
                row[0].scrollIntoView();
            }
        }
        this.#syncToggleButtons();
    }

    find(predicate) {
        return this.#dataTable.findRows(predicate);
    }
    findRows(predicate) {
        return this.#dataTable.findRows(predicate);
    }

    /* Table Interface */
    refreshRows() {
        if (this.#entityBroker) {
            this.#entityBroker.fetchEntitySet(
                (dataSet) => {
                    this.setRows(dataSet);
                }
            );
        }
    }

    setRows(dataSet) {
        this.#dataTable.setRows(dataSet, (row, data) => { this.#formatNewRow(row, data); });

        if (this._compareRows) {
            this.#dataTable.sortRows((lhs, rhs) => { return this._compareRows(lhs, rhs)});
        }

        this.#dataTable.stripeRows();

        this.#syncToggleButtons(false);
    }

    /* Housekeeping Interface */
    onAddEntity() {
        if (this._beginAddEntity) {
            this._beginAddEntity();
        }

        this.#showEditor(`Add ${this.#entityCaption}`, undefined, (data) => {
            this.#entityBroker.insertEntity(data, (data) => {
                // Insert the new table row.
                const row = this.#dataTable.appendRow(data, (row, data) => { this.#formatNewRow(row, data); });
                this.#dataTable.sortRows((lhs, rhs) => { return this._compareRows(lhs, rhs)});
                this.#dataTable.stripeRows();

                this.setSelectedRow(row, true);
            });
        });
    }

    onEditEntity() {
        if (this.#editor) {
            if (this._beginEditEntity) {
                this._beginEditEntity();
            }

            const row = this.getSelectedRow();
            if (row) {
                // Fetch entity data from the datasource
                this.#entityBroker.fetchEntity(row, (fetchedData) => {
                    // Show the editor
                    this.#showEditor(`Edit ${this.#entityCaption}`, fetchedData, (editedData) => {
                        // Store accepted changes in the datasource.
                        this.#entityBroker.updateEntity(row, editedData, (row, updatedData) => {
                            // Update the table row.
                            this._formatRow(row, updatedData);
                            this.#dataTable.sortRows((lhs, rhs) => { return this._compareRows(lhs, rhs)});
                            this.#dataTable.stripeRows();
                        });
                    });
                });
            }
        }
    }

    onDeleteEntity() {
        const row = this.getSelectedRow();
        if (row) {
            // TODO: display confirmation.

            this.#entityBroker.deleteEntity(row, () => {
                row.remove();
                this.#dataTable.stripeRows();
                this.#syncToggleButtons();
            });
        }
    }

    /*
    * Protected table interface
    */

    _formatRow(row, data) {
    }

    /*
    _compareRows(lhs, rhs) {
        return false;
    }
    */

    _onClickRow(row) {
        if (this.enableSelect) {
            const current = this.getSelectedRow();
            if (!current || (current[0] !== row[0])) {
                this.setSelectedRow(row);
            }
            else {
                this.setSelectedRow(undefined);
            }
        }
    }

    _onDoubleClickRow(row) {
        this.setSelectedRow(row);
        this.onEditEntity();
    }

    _getEditorData(editor) {
    }

    _setEditorData(editor, data) {
    }

    /*
    * Private
    */
    #formatNewRow(row, data) {
        this._formatRow(row, data);

        row.on("click", () => {
            this._onClickRow(row);
        });
        row.on("dblclick", () => {
            this._onDoubleClickRow(row);
        });
    }

    #syncToggleButtons(enable) {
        enable = (enable === undefined) ? (this.getSelectedRow() !== undefined) : enable;
        for (const current of this.#toggleButtons) {
            current.prop("disabled", !enable);
        }
    }

    #showEditor(caption, data, accept, cancel) {
        if (this.#editor) {
            this._setEditorData(this.#editor, data);

            this.#editor.find("#popupCaptionTitle").text(caption);

            Cpi.ShowPopup(
                this.#editor,
                () => {
                    Cpi.HidePopup(this.#editor);
                    if (accept) {
                        data = this._getEditorData(this.#editor);
                        accept(data);
                    }
                },
                () => {
                    Cpi.HidePopup(this.#editor);
                    if (cancel) {
                        cancel();
                    }
                }
            );
        }
    }
}