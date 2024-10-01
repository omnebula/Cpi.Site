

/*
* SchedulePage
*/
class SchedulePage extends CpiPage {
    #viewTracker;
    #coursePicker;
    #weekNumber;
    #weekDates;

    #headers;
    #containers;

    #controllers;
    #currentController;

    #courseSelector;
    #courseSelection;
    #selectedLessonId;

    constructor() {
        super();

        if (!this.validateLogin()) {
            return;
        }

        // Detect view-only mode.
        this.#viewTracker = new ViewTracker();

        if (this.#viewTracker.isActive) {
            $("#mySchedule").css("display", "inline-block");
            $(".siteCurrentMenuOption").css("display", "none");
        }
        else {
            $(document.documentElement).addClass("theme-normal");
            $("#mySchedule").css("display", "none");
        }

        // Initialize navigation controls.
        const selector = $("#selectWeek");
        for (var week = 1; week <= Cpi.GetLastWeekNumber(); ++week) {
            const option = $(document.createElement("option"));
            option.val(week);
            option.text(`Week ${week} - ${Cpi.FormatShortDateString(Cpi.CalculateWeekStartDate(week))}`);
            selector.append(option);
        }
        selector.on("change", () => {
            const newWeekNumber = selector.val();
            if (this.#weekNumber !== newWeekNumber) {
                this.navigateToWeek(newWeekNumber);
            }
        });

        $("#viewPreviousWeek").on("click", () => { this.navigateToWeek(this.#weekNumber - 1); });
        $("#viewNextWeek").on("click", () => { this.navigateToWeek(this.#weekNumber + 1); });
        $("#viewCurrentWeek").on("click", () => { this.navigateToWeek(); });

        // Initialize column headers.
        this.#headers = $(".scheduleColumnHeader");
        this.#containers = $(".scheduleLessonContainer");
        
        // Initialize course selector.
        if (this.viewTracker.isActive) {
            // If view-only, get course list from server.
            Cpi.SendApiRequest({
                method: "GET",
                url: `/@/account/courses?teacherId=${this.viewTracker.teacherId}`,
                success: (courses) => {
                    this.#initCourseSelector(courses);
                }
            });
        }
        else {
            // Otherwise, use the current user's list.
            this.#initCourseSelector(this.accountData.options.courses);
        }
    }
    #initCourseSelector(courses) {
        this.#courseSelector = $("#selectCourse");

        for (var course of courses) {
            this.#courseSelector.append(`<option value="${course.courseId}_${course.classId}">${course.courseName}</option>`);
        }

        this.#courseSelector.on("change", () => {
            const controllerName = this.#syncCourseSelection() === "all" ? "planner" : "reviewer";
            this.#activateController(controllerName, true);
        });

        const tunnelParams = Cpi.GetTunnelParams();
        if (tunnelParams) {
            this.selectedLessonId = tunnelParams.lessonId;
        }
        
        // Initialize the controllers.
        this.#controllers = {
            planner: new SchedulePlanner(this),
            reviewer: new ScheduleReviewer(this)
        };

        this.#activateController("planner", false);

        // Show frame and activate planner mode.
        Cpi.ShowAppFrame();

        const weekNumber = parseInt(this.#viewTracker.searchParams.get("week")) || Cpi.GetCurrentWeekNumber();
        this.navigateToWeek(weekNumber);

    }
    #syncCourseSelection() {
        const selection = this.#courseSelector.val();
        if (!selection || !selection.length) {
            return undefined;
        }

        const parts = selection.split("_");
        this.#courseSelection = {
            courseId: parts[0],
            classId: parts[1]
        };
        
        return selection;
    }

    /*
    * Operations
    */
    navigateToWeek(weekNumber) {
        this.#weekNumber = parseInt((!weekNumber || (weekNumber > Cpi.GetLastWeekNumber())) ? Cpi.GetCurrentWeekNumber() : weekNumber);

        this.#weekDates = Cpi.CalculateWeekDates(this.#weekNumber);

        $("#viewPreviousWeek").prop("disabled", this.#weekNumber === 1);

        $("#viewCurrentWeek").prop("disabled", this.#weekNumber === Cpi.GetCurrentWeekNumber());

        $("#viewNextWeek").prop("disabled", this.#weekNumber >= Cpi.GetLastWeekNumber());

        const today = Cpi.GetTodayDate();
        var containerDate = this.#weekDates.start;

        for (const current of this.#headers) {
            const lessonDate = containerDate;

            const lessonContainer = this.containerFromDate(lessonDate);
            lessonContainer.empty();

            const header = $(current);
            header.prop("lessonDate", lessonDate);
            header.find(".scheduleColumnDate").text(Cpi.FormatShortDateString(lessonDate));
            header.removeClass("scheduleColumnHeader_today");

            // Handle holiday
            const holidayName = Cpi.GetHolidayName(lessonDate);
            if (holidayName) {
                header.addClass("scheduleColumnHeader_holiday").prop("holiday", true);
                header.find(".scheduleColumnDay").addClass("scheduleColumn_holiday");
                header.find(".scheduleColumnDate").addClass("scheduleColumn_holiday");
                header.find(".scheduleColumnMenu").css("visibility", "hidden");

                lessonContainer.prop("holiday", true);
                lessonContainer.append(`<div class='scheduleHoliday'>${holidayName}</div>`);
            }
            // Else, do regular school day.
            else {
                header.removeClass("scheduleColumnHeader_holiday").prop("holiday", false);
                header.find(".scheduleColumnDay").removeClass("scheduleColumn_holiday");
                header.find(".scheduleColumnDate").removeClass("scheduleColumn_holiday");

                lessonContainer.prop("holiday", false);

                // Initizlize the column header dropdown menu if we're not in view-only mode.
                if (!this.#viewTracker.isActive) {
                    header.find(".scheduleColumnMenu").css("visibility", "visible");

                    const dropdown = header.find("#scheduleColumnMenuDropdown");
                    function enableColumnMenuDropdown(enable) {
                        dropdown.css("display", enable ? "" : "none");
                    }
    
                    header.find(".scheduleColumnMenuIcon").on("mouseenter", () => {
                        enableColumnMenuDropdown(true);
                    });

                    // Auto hide menu when user clicks an enabled option.
                    header.find(".scheduleColumnMenuOption").on("click", (event) => {
                        if ($(event.currentTarget).prop("enabled")) {
                            enableColumnMenuDropdown(false);    // disabling the dropdown closes it
                        }
                    })
                }
                // Else, disable (hide) the header dropdown menu.
                else {
                    header.find(".scheduleColumnMenu").css("visibility", "hidden");
                }

                // Highlight the current day's header.
                if (lessonDate.getTime() === today.getTime()) {
                    header.addClass("scheduleColumnHeader_today");
                }

            }

            // Move to the next day.
            containerDate = Cpi.DateAdd(containerDate, 1);
        }

        $("#selectWeek").val(this.#weekNumber);
        window.history.replaceState(null, "", `/schedule?week=${this.#weekNumber}${this.#viewTracker.viewParams}`);

        this.#activateController(null, true);
    }

    clearContainer(id) {
        const container = this.containerFromId(id);
        if (!container.prop("holiday")) {
            container.empty();
        }
    }
    clearAllContainers() {
        this.containers.each((key, value) => {
            const container = $(value);
            if (!container.prop("holiday")) {
                container.empty();
            }
        });
    }


    /*
    * Accessors
    */

    get weekNumber() {
        return this.#weekNumber;
    }
    get weekDates() {
        return this.#weekDates;
    }

    get viewTracker() {
        return this.#viewTracker;
    }
    get coursePicker() {
        if (!this.#coursePicker) {
            this.#coursePicker = new CoursePicker(this);
        }
        return this.#coursePicker;
    }

    columnIdFromDate(date) {
        return Cpi.DateDiff(date, this.#weekDates.start);
    }

    get scheduleBody() {
        return $(".scheduleBody");
    }

    get headers() {
        return this.#headers;
    }
    headerFromId(id) {
        return $(this.#headers[id]);
    }
    headerFromDate(date) {
        return this.headerFromId(this.columnIdFromDate(date));
    }

    get containers() {
        return this.#containers;
    }
    containerFromId(id) {
        return $(this.#containers[id]);
    }
    containerFromDate(date) {
        return this.containerFromId(this.columnIdFromDate(date));
    }

    get selectedLessonId() {
        return this.#selectedLessonId;
    }
    set selectedLessonId(lessonId) {
        this.#selectedLessonId = lessonId;
    }

    get courseSelection() {
        return this.#courseSelection;
    }
    setCourseSelection(courseId, classId) {
        this.#courseSelector.val(`${courseId}_${classId}`);
        if (this.#syncCourseSelection()) {
            this.#courseSelector.trigger("change");
        }
    }

    /*
    * Private Implementations
    */
    #activateController(controllerName, refresh) {
        if (controllerName) {
            if (this.#currentController) {
                this.#currentController.deactivate();
            }
    
            this.#currentController = this.#controllers[controllerName];
            this.#currentController.activate();
        }

        if (refresh) {
            this.#currentController.refresh();
        }

        return this.#currentController;
    }

}



window.page = new SchedulePage();