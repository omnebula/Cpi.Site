

/*
* SchedulePage
*/
class SchedulePage extends CpiPage {
    #settings;
    #viewTracker;
    #coursePicker;
    #weekNumber;
    #weekDates;

    #headers;
    #containers;
    #controllers;
    #currentController;
    #courseSelector;

    constructor() {
        super();

        if (!this.validateLogin()) {
            return;
        }

        var item = localStorage.getItem("schedulePage");
        if (item) {
            this.#settings = JSON.parse(item);
        }
        else {
            this.#settings = {};
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

        // Compute the start and end dates.
        this.#weekNumber = parseInt(this.#viewTracker.searchParams.get("week")) || Cpi.GetCurrentWeekNumber();

        this.#weekDates = Cpi.CalculateWeekDates(this.#weekNumber);

        // Initialize navigation controls.
        const selector = $("#selectWeek");
        for (var week = 1; week <= Cpi.GetLastWeekNumber(); ++week) {
            const option = $(document.createElement("option"));
            option.val(week);
            option.text(`Week ${week} - ${Cpi.FormatShortDateString(Cpi.CalculateWeekStartDate(week))}`);
            selector.append(option);
        }
        selector.val(this.#weekNumber);
        selector.on("change", () => {
            const newWeekNumber = selector.val();
            if (this.#weekNumber !== newWeekNumber) {
                this.navigateToWeek(newWeekNumber);
            }
        });

        if (this.#weekNumber > 1) {
            $("#viewPreviousWeek").on("click", () => { this.navigateToWeek(this.#weekNumber - 1); });
        }
        else {
            $("#viewPreviousWeek").prop("disabled", true);
        }

        if (this.#weekNumber !== Cpi.GetCurrentWeekNumber()) {
            $("#viewCurrentWeek").on("click", () => { this.navigateToWeek(); });
        }
        else {
            $("#viewCurrentWeek").prop("disabled", true);
        }

        if (this.#weekNumber < Cpi.GetLastWeekNumber()) {
            $("#viewNextWeek").on("click", () => { this.navigateToWeek(this.#weekNumber + 1); });
        }
        else {
            $("#viewNextWeek").prop("disabled", true);
        }

        // Initialize column headers.
        this.#headers = $(".scheduleColumnHeader");
        this.#containers = $(".scheduleLessonContainer");
        
        const today = Cpi.GetTodayDate();
        var containerDate = this.#weekDates.start;

        for (const current of this.#headers) {
            const header = $(current);
            const lessonDate = containerDate;

            header.prop("lessonDate", lessonDate);
            header.find(".scheduleColumnDate").text(Cpi.FormatShortDateString(lessonDate));

            // Handle holiday
            const holidayName = Cpi.GetHolidayName(lessonDate);
            if (holidayName) {
                header.addClass("scheduleColumnHeader_holiday").prop("holiday", true);
                header.find(".scheduleColumnDay").addClass("scheduleColumn_holiday");
                header.find(".scheduleColumnDate").addClass("scheduleColumn_holiday");
                header.find(".scheduleColumnMenu").css("visibility", "hidden");

                const lessonContainer = this.containerFromDate(lessonDate);
                lessonContainer.prop("holiday", true);
                lessonContainer.append(`<div class='scheduleHoliday'>${holidayName}</div>`);
            }
            // Else, do regular school day.
            else {
                // Initizlize the column header dropdown menu if we're not in view-only mode.
                if (!this.#viewTracker.isActive) {
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
                    header.find(".scheduleColumnMenu").css("display", "none");
                }
            }

            // Highlight the current day's header.
            if (lessonDate.getTime() === today.getTime()) {
                header.find(".scheduleColumnHeader").addClass("scheduleColumnHeader_today");
            }

            // Move to the next day.
            containerDate = Cpi.DateAdd(containerDate, 1);
        }

        // Initialize course selector.
        // If view-only...
        if (this.viewTracker.isActive) {
            Cpi.SendApiRequest({
                method: "GET",
                url: `/@/account/courses?teacherId=${this.viewTracker.teacherId}`,
                success: (courses) => {
                    this.#initControllers(courses);
                }
            })
        }
        else {
            this.#initControllers(this.accountData.options.courses);
        }
    }
    #initControllers(courses) {
        this.#courseSelector = $("#selectCourse");

        for (var course of courses) {
            this.#courseSelector.append(`<option value="${course.courseId}_${course.classId}">${course.courseName}</option>`);
        }

        this.#courseSelector.on("change", () => {
            const selection = this.#courseSelector.val();
            if (selection === "all") {
                this.#settings.courseValue = undefined;
                this.#saveSettings();
                this.#activateController("planner");
            }
            else {
                this.#settings.courseValue = selection;
                this.#saveSettings();
                this.#activateController("reviewer");
            }
        });

        // Initialize the controllers.
        var initialController = "planner";

        if (this.#settings.courseValue) {
            this.#courseSelector.val(this.#settings.courseValue);
            initialController = "reviewer";
        }
        
        this.#controllers = {
            planner: new SchedulePlanner(this),
            reviewer: new ScheduleReviewer(this)
        };

        // Show frame and activate planner mode.
        Cpi.ShowAppFrame();

        this.#activateController(initialController);
    }

    /*
    * Operations
    */
    navigateToWeek(weekNumber) {
        if (!weekNumber) {
            weekNumber = Cpi.GetCurrentWeekNumber();
        }

        window.location.href = `/schedule?week=${weekNumber}${this.#viewTracker.viewParams}`;
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

    get selectedCourseValue() {
        const selection = this.#courseSelector.find(":selected");
        if (!selection || !selection.length) {
            return undefined;
        }
        return selection.val();
    }

    /*
    * Private Implementations
    */
    #activateController(controllerName) {
        if (this.#currentController) {
            this.#currentController.deactivate();
        }

        this.#currentController = this.#controllers[controllerName];

        this.#currentController.activate();
    }

    #saveSettings() {
        localStorage.setItem("schedulePage", JSON.stringify(this.#settings));
    }

}



window.page = new SchedulePage();