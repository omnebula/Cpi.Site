class ScheduleController {
    #schedulePage;

    constructor(schedulePage) {
        this.#schedulePage = schedulePage;
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

    get editors() {
        return $(".scheduleEditor");
    }
    editorFromDate(date) {
        const columnId = this.columnIdFromDate(date);
        return this.editorFromId(columnId);
    }
    editorFromId(id) {
        const container = this.containerFromId(id);
        return container.find(".scheduleEditor");
    }

    get queryUrl() {
        var url = `/@/lessons?week=${this.weekNumber}`;
        if (this.viewTracker.isActive) {
            url += `&teacherId=${this.viewTracker.teacherId}`;
        }
        return url;
    }
    
    /*
    * Operations
    */

    activate() {
    }

    deactivate() {
        this.schedulePage.clearAllContainers();
    }
    
    populateSchedule(lessons) {
    }

    clearContainer(id) {
        this.schedulePage.clearContainer(id);
    }
    clearAllContainers() {
        this.schedulePage.clearAllContainers();
    }

    fetchLessons(url, success) {
        Cpi.SendApiRequest({
            method: "GET",
            url: url,
            success: (data, status, xhr) => {
                success(data, status, xhr);

                if (this.schedulePage.selectedLessonId) {
                    this.schedulePage.currentController.selectLesson(this.schedulePage.selectedLessonId);
                    
                    // Only acknowledge selection the first time it's established.
                    this.schedulePage.selectedLessonId = undefined;
                }
            }
        });
    }

    bumpLessons(header, courseId, classId) {
        const from = header.prop("lessonDate");
        var target = Cpi.DateAdd(from, 1);
        while (Cpi.IsHoliday(target) || Cpi.IsWeekend(target)) {
            target = Cpi.DateAdd(target, 1);
        }

        this.schedulePage.pickDate({
            title: "Bump Lessons",
            from: Cpi.FormatIsoDateString(from),
            to: Cpi.FormatIsoDateString(target),
            accept: (pickResults) => {
                const params = {
                    from: pickResults.from,
                    offset: pickResults.offset,
                    courseId: courseId,
                    classId: classId
                }
       
                Cpi.SendApiRequest({
                    method: "POST",
                    url: "/@/lesson/move?action=bump",
                    data: JSON.stringify(params),
                    success: () => {
                        this.schedulePage.navigateToDate(pickResults.to);
                    }
                });
            }
        });
    }
}
