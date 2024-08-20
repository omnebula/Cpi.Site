class DataTable {
    /*
    * Public Interface
    */
    constructor(table, rowTemplate, options) {
        this.#options = options || {
            stripe: true,
            setWidths: true,
            maxHeight: "auto",
            oddClass: "st-tr-odd",
            evenClass: "st-tr-even"
        };

        this.#table = table;
        this.#rowTemplate = rowTemplate || this.#table.find("tbody tr").detach();

        const scrolltable = this.#table.scrolltable(this.#options);

        this.#rowContainer = this.#table.find(".st-body-table tbody");
        this.#rowContainer.css("vertical-align", "top");
    }

    get table() {
        return this.#table;
    }
    get rows() {
        return this.#rowContainer.children()
    }

    find(predicate) {
        return this.#table.find(predicate);
    }

    clear() {
        this.#rowContainer.find("tbody").empty();
    }

    setRows(dataSet, initializer) {
        this.clear();

        if (dataSet) {
            for (const data of dataSet) {
                this.appendRow(data, initializer);
            }
        }

        if (this.#options.comparer) {
            this.sortRows(this.#options.comparer);
        }
        else if (this.#options.stripe) {
            this.stripeRows();
        }
    }

    prependRow(data, initializer) {
        const row = this.#createRow(data, initializer);
        this.#rowContainer.prepend(row);
        if (this.#options.comparer) {
            this.sortRows(this.#options.comparer);
        }
        else if (this.#options.stripe) {
            this.stripeRows();
        }
        return row;
    }

    appendRow(data, initializer) {
        const row = this.#createRow(data, initializer);
        this.#rowContainer.append(row);
        if (this.#options.comparer) {
            this.sortRows(this.#options.comparer);
        }
        else if (this.#options.stripe) {
            this.stripeRows();
        }
        return row;
    }

    removeRow(predicate) {
        this.find(predicate).remove();
        if (this.#options.stripe) {
            this.stripeRows();
        }
    }

    sortRows(comparator)  {
        comparator = comparator || this.#options.comparator;
        if (comparator) {
            const items = this.#rowContainer.children().sort((a, b) => { return comparator(a, b) });
            this.#rowContainer.append(items);        
    
            if (this.#options.stripe) {
                this.stripeRows();
            }
        }
    }

    stripeRows(oddClass, evenClass) {
		this.#rowContainer.find("tr")
			.filter(':odd').addClass(oddClass || this.#options.oddClass).end()
			.filter(':even').addClass(evenClass || this.#options.evenClass);
    }

    /*
    * Private Interface
    */
    #table;
    #rowTemplate;
    #rowContainer;
    #options;

    #createRow(data, initializer) {
        const row = this.#rowTemplate.clone(true);

        if (initializer) {
            initializer(row, data);
        }

        return row;
    }
}