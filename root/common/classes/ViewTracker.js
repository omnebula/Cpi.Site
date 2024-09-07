

class ViewTracker {
    #searchParams;
    #viewParams;
    #teacherId;
    #teacherName;
    #origin;

    constructor() {
        this.#searchParams = new URLSearchParams(window.location.search);

        const teacherId = this.#searchParams.get("tid");
        const teacherName = this.#searchParams.get("tname");
        if (this.activate(teacherId, teacherName)) {
            this.#origin = this.#searchParams.get("orig");
            if (this.#origin) {
                this.#viewParams += `&orig=${this.#origin}`;
            }
        }
        else {
            this.#viewParams = "";
        }
    }

    get searchParams() {
        return this.#searchParams;
    }
    get viewParams() {
        return this.#viewParams;
    }
    get teacherId() {
        return this.#teacherId;
    }
    get teacherName() {
        return this.#teacherName;
    }
    get origin() {
        return this.#origin;
    }

    get isActive() {
        return this.#teacherId !== null && this.#teacherId !== undefined;
    }
    activate(teacherId, teacherName) {
        if (teacherId && teacherName) {
            this.#teacherId = teacherId;
            this.#teacherName = teacherName;

            $(document.documentElement).addClass("theme-view-only");
            this.#viewParams = `&tid=${this.#teacherId}&tname=${this.#teacherName}`;
    
            const pageTitleName = $("#pageTitleName");
            pageTitleName.text(`View ${pageTitleName.text()}:`);
    
            const pageSubTitle = $("#pageSubTitle");
            pageSubTitle.text(this.#teacherName);
            pageSubTitle.css("display", "inline-block");

            return true;
        }
        else {
            return false;
        }
    }
}