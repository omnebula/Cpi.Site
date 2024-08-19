class DataTable {
    /*
    * Public Interface
    */
    constructor(tablePredicate, rowPredicate, createParams) {
        this.#tableTemplate = ((typeof tablePredicate === "string") ? $(tablePredicate) : tablePredicate);

        this.#parent = this.#tableTemplate.parent();

        this.#tableTemplate.detach();

        this.#rowTemplate = ((typeof rowPredicate === "string") ? this.#tableTemplate.find(rowPredicate) : rowPredicate).detach();

        this.#createParams = createParams || {
            stripe: true,
            setWidths: true,
            maxHeight: "auto"
        };
    }

    get tableTemplate() {
        return this.#tableTemplate;
    };
    get rowTemplate() {
        return this.#rowTemplate;
    }

    get table() {
        return this.#table;
    }
    
    get rows() {
        return this.#rowContainer ? this.#rowContainer.children() : undefined;
    }
    get selectedRow() {
        return this.#selectedRow;
    }

    find(predicate) {
        return this.#table ? this.#table.find(predicate) : undefined;
    }

    setRows(dataset, initializer) {
        const table = this.#tableTemplate.clone(true);
        this.#rowContainer = table.find("tbody");

        if (dataset) {
            for (const data of dataset) {
                this.#appendRow(data, initializer);
            }
        }

        if (this.#table) {
            this.#table.remove();
        }
        this.#table = table;
        this.#parent.append(this.#table);

        this.#table.show();

        this.#table.scrolltable(this.#createParams);

        this.#table.find("tbody").css("vertical-align", "top");
    }

    prependRow(data, initializer) {
        if (!this.#table) {
            this.setRows([data], initializer);
        }
        else {
            this.#prependRow(data, initializer);
        }
    }
    #prependRow(data, initializer) {
        const row = this.#createRow(data, initializer);
        this.#rowContainer.prepend(row);
        return row;
    }

    appendRow(data, initializer) {
        if (!this.#table) {
            this.setRows([data], initializer);
        }
        else {
            this.#appendRow(data, initializer);
        }
    }
    #appendRow(data, initializer) {
        const row = this.#createRow(data, initializer);
        this.#rowContainer.append(row);
        return row;
    }

    removeRow(predicate) {
        this.find(predicate).remove();
    }

    sortRows(columnPredicate, comparator)  {
        comparator = comparator || ((a, b) => {
            const vA = $(a).text();
            const vB = $(b).text();
            return vA.localeCompare(vB, undefined, 'base');
        });
        const items = this.#rowContainer.children().sort((a, b) => { return comparator(a, b) });
        this.#rowContainer.append(items);        
    }

    /*
    * Private Interface
    */
    #parent;
    #table;
    #tableTemplate;
    #rowTemplate;
    #rowContainer;
    #selectedRow;
    #createParams;

    #initTable() {

    }

    #createRow(data, initializer) {
        const row = this.#rowTemplate.clone(true);

        // Initialize mouseover (highlighting).
        row.on("mouseover",
            () => {
                const hoverRow = $(".hoverListRow");
                if (hoverRow.length) {
                    hoverRow.removeClass("hoverListRow");
                }
                if (hoverRow !== row) {
                    row.addClass("hoverListRow");
                }
            });
        row.on("click",
            () => {
                if (this.#selectedRow !== row) {
                    if (this.#selectedRow) {
                        this.#selectedRow.removeClass("selectedListRow");
                    }
                    this.#selectedRow = row;
                    this.#selectedRow.addClass("selectedListRow");
                }
            });

        if (initializer) {
            initializer(row, data);
        }

        return row;
    }
}