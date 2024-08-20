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
            holidayTable: new DataTable($("#holidayTable"))
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

    #initStudentsOverlay() {
        const controller = new StudentController();
        this.#registerOverlayContext("Students", {
            activate: () => {
                controller.refreshRows();
            }
        });
    }

    #initClassesOverlay() {
        const controller = new ClassController();
        this.#registerOverlayContext("Classes", {
            activate: () => {
                controller.refreshRows();
            }
        });
    }

    #initCoursesOverlay() {
        const controller = new CourseController();
        this.#registerOverlayContext("Courses", {
            activate: () => {
                controller.refreshRows();
            }
        });
    }

    #initLocationsOverlay() {
        const controller = new LocationController();
        this.#registerOverlayContext("Locations", {
            activate: () => {
                controller.refreshRows();
            }
        });
    }

    #initAccountsOverlay() {
        const controller = new AccountController();
        this.#registerOverlayContext("Accounts", {
            activate: () => {
                controller.refreshRows();
            }
        });
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


class StudentController extends EntityController {
    constructor() {
        super({
            entityName: "student",
            entitySetName: "students",
            entityCaption: "Student",
            table: $("#studentTable"),
            addButton: $("#addStudent"),
            editButton: $("#editStudent"),
            deleteButton: $("#deleteStudent"),
            toggleButtons: [ $("#assignStudentClasses") ],
            editor: $("#studentEditor")
        });
    }

    formatRow(row, student) {
        row.find("#studentNameColumn").text(`${student.lastName}, ${student.firstName}`);
        row.find("#studentNumberColumn").text(student.studentNumber || "");
        row.find("#studentGradeColumn").text(student.gradeName || "");
        row.find("#studentLocationColumn").text(student.locationName);
    }

    compareRows(lhs, rhs) {
        const left = $(lhs).find("#studentNameColumn").text();
        const right = $(rhs).find("#studentNameColumn").text();
        return left.localeCompare(right);
    }
}


class AccountController extends EntityController {
    constructor() {
        super({
            entityName: "account",
            entitySetName: "accounts",
            entityCaption: "Account",
            listUrl: "/@/accounts?columns=accountId,lastName,firstName,accessType,statusType",
            table: $("#accountTable"),
            addButton: $("#addAccount"),
            editButton: $("#editAccount"),
            deleteButton: $("#deleteAccount"),
            toggleButtons: [ $("#sendAccountInvite"), $("#assignAccountClasses") ],
            editor: $("#accountEditor")
        });
    }

    formatRow(row, account) {
        row.find("#accountNameColumn").text(`${account.lastName}, ${account.firstName}`);
        row.find("#accountAccessColumn").text(account.accessType);
        row.find("#accountStatusColumn").text(account.statusType);
    }

    compareRows(lhs, rhs) {
        const left = $(lhs).find("#accountNameColumn").text();
        const right = $(rhs).find("#accountNameColumn").text();
        return left.localeCompare(right);
    }
}


class ClassController extends EntityController {
    constructor() {
        super({
            entityName: "class",
            entitySetName: "classes",
            entityCaption: "Class",
            table: $("#classTable"),
            addButton: $("#addClass"),
            editButton: $("#editClass"),
            deleteButton: $("#deleteClass"),
            deleteButton: $("#deleteClass"),
            toggleButtons: [ $("#assignClassStudents"), $("#assignClassCourses") ],
            editor: $("#classEditor")
        });
    }

    formatRow(row, classData) {
        row.find("#classNameColumn").text(classData.className);
        row.find("#classTeacherColumn").text(classData.teacherLastName ? `${classData.teacherLastName}, ${classData.teacherFirstName}` : "");
        row.find("#classLocationColumn").text(classData.locationName);
    }

    compareRows(lhs, rhs) {
        const left = $(lhs).find("#classNameColumn").text();
        const right = $(rhs).find("#classNameColumn").text();
        return left.localeCompare(right);
    }
}

class CourseController extends EntityController {
    constructor() {
        super({
            entityName: "course",
            entitySetName: "courses",
            entityCaption: "Course",
            table: $("#courseTable"),
            addButton: $("#addCourse"),
            editButton: $("#editCourse"),
            deleteButton: $("#deleteCourse"),
            toggleButtons: [ $("#assignCourseClasses") ],
            editor: $("#courseEditor")
        });
    }

    formatRow(row, course) {
        row.find("#courseNameColumn").text(course.courseName);
        row.find("#courseSubjectColumn").text(course.subjectName || "");
        row.find("#courseGradeColumn").text(course.gradeName || "");
    }

    compareRows(lhs, rhs) {
        const left = $(lhs).find("#courseNameColumn").text();
        const right = $(rhs).find("#courseNameColumn").text();
        return left.localeCompare(right);
    }
}


class LocationController extends EntityController {
    constructor() {
        super({
            entityName: "location",
            entitySetName: "locations",
            entityCaption: "Location",
            table: $("#locationTable"),
            addButton: $("#addLocation"),
            editButton: $("#editLocation"),
            deleteButton: $("#deleteLocation"),
            editor: $("#locationEditor")
        });
    }

    formatRow(row, location) {
        row.find("#locationNameColumn").text(location.locationName);
    }

    compareRows(lhs, rhs) {
        const left = $(lhs).find("#locationNameColumn").text();
        const right = $(rhs).find("#locationNameColumn").text();
        return left.localeCompare(right);
    }
}


window.page = new OrganizationPage();