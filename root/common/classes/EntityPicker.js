

class EntityPicker {
    #settings;
    #dataTable;

    constructor(settings) {
        this.#settings = settings;
        this.#dataTable = new DataTable(settings.pickerTable);
    }

    show(params) {
        this.#settings.entityBroker.fetchEntitySet(
            (dataSet) => {
                this.#dataTable.setRows(dataSet, (row, data) => { this.#settings.formatRow(row, data); });
                Cpi.ShowPopup(this.#settings.pickerPopup, () => { this.#acceptSelection(params.accept); }, params.cancel);
            },
            params.listUrl
        );
    }

    #acceptSelection(accept) {
        const selection = [];
        const checkboxes = this.#dataTable.findRows("tbody input:checked");

        for (const current of checkboxes) {
            selection.push($(current).parent().parent());
        }

        accept(selection);
    }
}