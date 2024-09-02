

class DataTable {
    /*
    * Public Interface
    */
    constructor(table, rowTemplate, options) {
        this.#options = {
            height: 'auto',
            maxHeight: 'auto',
            stripe: false,
            setWidths: true,
            oddClass: "st-tr-odd",
            evenClass: "st-tr-even",
            firstClass: "st-tr-first",
            lastClass: "st-tr-last"
        };

        if (options) {
            this.#options.height = options.height || this.#options.height,
            this.#options.maxHeight = options.height || this.#options.maxHeight,
            this.#options.stripe = (options.stripe !== undefined) ? options.stripe : this.#options.stripe,
            this.#options.setWidths = (options.setWidths !== undefined) ? options.setWidths: this.#options.setWidths,
            this.#options.oddClass = options.oddClass || this.#options.oddClass,
            this.#options.evenClass = options.evenClass || this.#options.evenClass,
            this.#options.firstClass = options.firstClass || this.#options.firstClass,
            this.#options.lastClass = options.lastClass || this.#options.lastClass
        }

        this.#table = table;
        this.#rowTemplate = rowTemplate || this.#table.find("tbody tr").detach();

        const scrolltable = this.#table.scrolltable(this.#options);

        this.#rowContainer = this.#table.find(".st-body-table tbody");
        this.#rowContainer.css("vertical-align", "top");

        const headTable = table.find(".st-head-table");
        const bodyTable = table.find(".st-body-table");
        new ResizeObserver(() => {
            if (bodyTable.width() != headTable.width()) {
                headTable.width(bodyTable.width());
            }
        }).observe(bodyTable[0]);
    }

    get table() {
        return this.#table;
    }
    get rows() {
        return this.#rowContainer.children()
    }
    get rowContainer() {
        return this.#rowContainer;
    }

    findRows(predicate) {
        return this.#table.find(predicate);
    }
    find(predicate) {
        return this.#table.find(predicate);
    }

    clearRows() {
        this.#rowContainer.empty();
    }
    empty() {
        this.#rowContainer.empty();
    }

    setRows(dataSet, initializer) {
        this.clearRows();

        if (dataSet) {
            for (const data of dataSet) {
                this.appendRow(data, initializer);
            }
        }
    }

    prependRow(data, initializer) {
        const row = this.#createRow(data, initializer);
        this.#rowContainer.prepend(row);
        return row;
    }

    appendRow(data, initializer) {
        const row = this.#createRow(data, initializer);
        this.#rowContainer.append(row);
        return row;
    }

    removeRow(predicate) {
        this.find(predicate).remove();
    }

    sortRows(comparator)  {
        const items = this.#rowContainer.children().sort((a, b) => { return comparator(a, b) });
        this.#rowContainer.append(items);        
    }

    stripeRows(oddClass, evenClass) {
        oddClass = oddClass || this.#options.oddClass;
        evenClass = evenClass || this.#options.evenClass;

        const selection = this.#table.find(".st-body-scroll>table>tbody>tr");
        selection.removeClass(`${oddClass} ${evenClass}`);

		selection
			.filter(':odd').addClass(oddClass).end()
			.filter(':even').addClass(evenClass);
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