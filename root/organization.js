class OrganizationPage extends CpiPage {
    #currentOverlayName;
    #overlayContexts = {};

    constructor() {
        super();
        
        if (!Cpi.IsLoggedIn()) {
            return;
        }

        this.#initSettingsOverlay();
        this.#initCalendarOverlay();
        this.#initStudentsOverlay();
        this.#initAccountsOverlay();
        this.#initClassesOverlay();
        this.#initCoursesOverlay();
        this.#initLocationsOverlay();

        // Show initial overlay.
        const lastOverlayName = localStorage.getItem("organizationOverlayName");
        this.#showOverlay(lastOverlayName || $(overlayOptions[0]).val());
    }

    #showOverlay(listName) {
        if (this.#currentOverlayName) {
            $(`input[value="${this.#currentOverlayName}"]`).toggleClass("overlaySelectorOption activeOverlaySelectorOption");
            $(`#${this.#currentOverlayName}`).css("display", "none");

            const context = this.#overlayContexts[this.#currentOverlayName];
            if (context && context.deactivate) {
                context.deactivate();
            }
        }

        this.#currentOverlayName = listName;
        localStorage.setItem("organizationOverlayName", this.#currentOverlayName);

        const context = this.#overlayContexts[this.#currentOverlayName];
        if (context && context.activate) {
            context.activate();
        }

        $(`input[value="${this.#currentOverlayName}"]`).toggleClass("overlaySelectorOption activeOverlaySelectorOption");
        $(`#${this.#currentOverlayName}`).css("display", "flex");
    }

    #getOverlayContext(overlayName) {
        return this.#overlayContexts[overlayName];
    }
    #registerOverlayContext(overlayName, context) {
        const option = $("<input/>");
        option.attr("type", "button");
        option.val(overlayName);
        option.addClass("inputButton overlaySelectorOption");
        option.on("click", (ev) => {
            this.#showOverlay(overlayName);
        });

        $(".overlaySelector").append(option);

        this.#overlayContexts[overlayName] = context;
    }

    /*
    * Settings
    */
    #initSettingsOverlay() {
        this.#registerOverlayContext("Settings", {
            activate: () => { this.#activateSettingsOverlay(); },
            deactivate: () => { this.#enableSettingsModal(false); }
         } );

        $("#editSettings").on("click", () => {
            this.#enableSettingsModal(true);
        });
        $("#acceptSettingsChanges").on("click", () => {
            this.#enableSettingsModal(false);
        });
        $("#cancelSettingsChanges").on("click", () => {
            this.#enableSettingsModal(false);
        });

        this.#enableSettingsModal(false);
    }
    #activateSettingsOverlay() {
        this.sendApiRequest({
            method: "GET",
            url: "/@/organization",
            success: (data, status, xhr) => {
                // Initialize property editor
                $("#organizationName").val(data.organizationName);
            }
        });
    }
    #enableSettingsModal(enable) {
        this.#enableEditMode(
            enable,
            ["#organizationName"],
            "#settingsActionCommands",
            "#settingsModalCommands");
    }
    #updateSettings() {
    }

    /*
    * Calendar
    */
    #initCalendarOverlay() {
        const holidayTableParams = { 
            stripe: true, 
            oddClass: "holidayOddRow",
            setWidths: true,
            maxHeight: "auto"
        };

        this.#registerOverlayContext("Calendar", {
            activate: () => { this.#activateCalendarOverlay(); },
            deactivate: () => { this.#enableCalendarModal(false); },
            holidayTable: new DataTable("#holidayTable", "#holidayListRow")          
        });

        $("#editCalendar").on("click", () => {
            this.#enableCalendarModal(true);
        });
        $("#addCalendar").on("click", () => {
            this.#enableCalendarModal(true);
        });
        $("#acceptCalendarChanges").on("click", () => {
            this.#enableCalendarModal(false);
        });
        $("#cancelCalendarChanges").on("click", () => {
            this.#enableCalendarModal(false);
        });

        $("#addHoliday").on("click", () => {
        });
        $("#editHoliday").on("click", () => {
        });
        $("#deleteHoliday").on("click", () => {
        });

        this.#enableCalendarModal(false);
    }

    #activateCalendarOverlay() {
        this.#enableCalendarModal(false);

        this.sendApiRequest({
            method: "GET",
            url: "@/calendar",
            success: (data, status, xhr) => {
                $("#calendarName").val(data.calendarName);
                $("#calendarStartDate").val(data.startDate);
                $("#calendarEndDate").val(data.endDate);

                const context = this.#getOverlayContext("Calendar");
                const holidayTable = context.holidayTable;

                holidayTable.setRows(
                    data.holidays, 
                    (row, data) => {
                        row.find("#holidayNameColumn").text(data[0]);
                        row.find("#holidayStartDateColumn").text(Cpi.FormatShortDateString(data[1]));
                        row.find("#holidayEndDateColumn").text(Cpi.FormatShortDateString(data[2] || data[1]));

                        row.on("click", () => {
                            const currentSelection = $(".holidayListRow_selected");
                            currentSelection.toggleClass("holidayListRow_selected");

                            if (row.hasClass("holidayListRow_active")) {
                                if (currentSelection[0] !== row[0]) {
                                    row.addClass("holidayListRow_selected");
                                    this.#enableHolidayActionButtons(true);
                                }
                                else {
                                    this.#enableHolidayActionButtons(false);
                                }
                            }

                        });
                    }
                );
            }
        });
    }
    #enableCalendarModal(enable) {
        this.#enableEditMode(
            enable,
            ["#calendarName", "#calendarStartDate", "#calendarEndDate"],
            "#calendarActionCommands",
            "#calendarModalCommands");

        $("#holidayActionCommands").css("display", enable ? "flex" : "none");

        if (enable) {
            $(".holidayListRow").addClass("holidayListRow_active");
        }
        else {
            $(".holidayListRow").removeClass("holidayListRow_active");
        }

        $(".holidayListRow_selected").removeClass("holidayListRow_selected");
        this.#enableHolidayActionButtons(false);
    }
    #enableHolidayActionButtons(enable) {
        $("#editHoliday").prop("disabled", !enable);
        $("#deleteHoliday").prop("disabled", !enable);
    }

    /*
    * Students
    */
    #initStudentsOverlay() {
        this.#registerOverlayContext("Students", {
            activate: () => { this.#activateStudentsOverlay(); },
            table: new DataTable("#studentTable", "#studentRow")          
        });
    }
    #activateStudentsOverlay() {
        this.sendApiRequest({
            method: "GET",
            url: "/@/students",
            success: (data, status, xhr) => {
                const context = this.#getOverlayContext("Students");
                
                context.table.setRows(data, (row, student) => {
                    row.find("#studentNameColumn").text(`${student.lastName}, ${student.firstName}`);
                    row.find("#studentNumberColumn").text(student.studentNumber || "");
                    row.find("#studentGradeColumn").text(student.gradeName || "");
                    row.find("#studentLocationColumn").text(student.locationName);
                });
            }
        });

    }

    /*
    * Classes
    */
    #initClassesOverlay() {
        this.#registerOverlayContext("Classes", {
            activate: () => { this.#activateClassesOverlay(); },
            table: new DataTable("#classTable", "#classRow")          
        });
    }
    #activateClassesOverlay() {
        this.sendApiRequest({
            method: "GET",
            url: "/@/classes",
            success: (data, status, xhr) => {
                const context = this.#getOverlayContext("Classes");
                
                context.table.setRows(data, (row, classData) => {
                    row.find("#classNameColumn").text(classData.className);
                    row.find("#classTeacherColumn").text(classData.teacherLastName ? `${classData.teacherLastName}, ${classData.teacherFirstName}` : "");
                    row.find("#classLocationColumn").text(classData.locationName);
                });
            }
        });
    }

    /*
    * Courses
    */
    #initCoursesOverlay() {
        this.#registerOverlayContext("Courses", {
            activate: () => { this.#activateCoursesOverlay(); },
            table: new DataTable("#courseTable", "#courseRow")          
        });
    }
    #activateCoursesOverlay() {
        this.sendApiRequest({
            method: "GET",
            url: "/@/courses",
            success: (data, status, xhr) => {
                const context = this.#getOverlayContext("Courses");
                
                context.table.setRows(data, (row, course) => {
                    row.find("#courseNameColumn").text(course.courseName);
                    row.find("#courseSubjectColumn").text(course.subjectName || "");
                    row.find("#courseGradeColumn").text(course.gradeName || "");
                });
            }
        });
    }

    /*
    * Locations
    */
    #initLocationsOverlay() {
        this.#registerOverlayContext("Locations", {
            activate: () => { this.#activateLocationsOverlay(); },
            table: new DataTable("#locationTable", "#locationRow")          
        });
    }
    #activateLocationsOverlay() {
        this.sendApiRequest({
            method: "GET",
            url: "/@/locations",
            success: (data, status, xhr) => {
                const context = this.#getOverlayContext("Locations");
                
                context.table.setRows(data, (row, location) => {
                    row.find("#locationNameColumn").text(location.locationName);
                });
            }
        });
    }

    /*
    * Accounts
    */
    #initAccountsOverlay() {
        this.#registerOverlayContext("Accounts", {
            activate: () => { this.#activateAccountsOverlay(); },
            table: new DataTable("#accountTable", "#accountRow")          
        });

        $("#addAccount").on("click", () => {
        });
        $("#editAccount").on("click", () => {
        });
        $("#deleteAccount").on("click", () => {
        });

    }
    #activateAccountsOverlay() {
        this.sendApiRequest({
            method: "GET",
            url: "/@/accounts",
            success: (data, status, xhr) => {
                const context = this.#getOverlayContext("Accounts");
                
                context.table.setRows(data, (row, account) => {
                    row.find("#accountNameColumn").text(`${account.lastName}, ${account.firstName}`);
                    row.find("#accountAccessColumn").text(account.accessType);
                    row.find("#accountStatusColumn").text(account.statusType);
                });
            }
        });
    }
    #syncAccountActionButtons() {

    }


    /*
    * Utilities
    */
    #enableEditMode(enable, inputElements, actionGroupId, modalGroupId) {
        for (const id of inputElements) {
            $(id).prop("disabled", !enable);
        }

        $(actionGroupId).css("display", enable ? "none" : "flex");
        $(modalGroupId).css("display", enable ? "flex" : "none");
    }
}

window.page = new OrganizationPage();