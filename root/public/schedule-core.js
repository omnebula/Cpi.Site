class ScheduleController {
    #schedulePage;

    constructor(schedulePage) {
        this.#schedulePage = schedulePage;
    }

    /*
    * Operations
    */

    activate() {
    }

    deactivate() {
        this.schedulePage.clearAllContainers();
    }

    /*
    * Accessors
    */

    get schedulePage() {
        return this.#schedulePage;
    }

    get scheduleBody() {
        return this.schedulePage.scheduleBody;
    }

    get viewTracker() {
        return this.schedulePage.viewTracker;
    }
    get coursePicker() {
        return this.schedulePage.coursePicker;
    }

    get weekNumber() {
        return this.schedulePage.weekNumber;
    }
    get weekDates() {
        return this.schedulePage.weekDates;
    }

    columnIdFromDate(date) {
        return this.schedulePage.columnIdFromDate(date);
    }

    get headers() {
        return this.schedulePage.headers;
    }
    headerFromId(id) {
        return this.schedulePage.headerFromId(id);
    }
    headerFromDate(date) {
        return this.schedulePage.headerFromDate(date);
    }

    get containers() {
        return this.schedulePage.containers;
    }
    containerFromId(id) {
        return this.schedulePage.containerFromId(id);
    }
    containerFromDate(date) {
        return this.schedulePage.containerFromDate(date);
    }
}