class OrganizationPage extends CpiPage {
    #overlayController;

    constructor() {
        super();
        
        if (!Cpi.ValidateLogin()) {
            return;
        }

        const overlays = [
            new SettingsOverlay(),
            new CalendarOverlay(),
            new StudentOverlay(),
            new AccountOverlay(),
            new ClassOverlay(),
            new CourseOverlay(),
            new LocationOverlay()
        ];
        this.#overlayController = new OverlayController(overlays);

        // Show initial overlay.
        const lastOverlayName = localStorage.getItem("organizationOverlayName");
        this.#overlayController.showOverlay(lastOverlayName || overlays[0].name);
    }

    /* Brokers */
    static StudentBroker = new EntityBroker({ entityName: "student" });
    static AccountBroker = new EntityBroker({ entityName: "account" });
    static ClassBroker = new EntityBroker({ entityName: "class", entitySetName: "classes" });
    static CourseBroker = new EntityBroker({ entityName: "course" });
    static LocationBroker = new EntityBroker({ entityName: "location" });

    /* Pickers */
    static CoursePicker = new EntityPicker({
        pickerPopup: $("#coursePicker"),
        pickerTable: $("#coursePicker #courseTable"),
        entityBroker:  OrganizationPage.CourseBroker,
        formatRow: (row, data) => {
            row.attr("id", data.courseId);
            row.find(".pickerCheckbox").prop("checked", data.assigned);
            row.find("#courseNameColumn").text(data.courseName);
            row.find("#courseSubjectColumn").text(data.subjectName);
            row.find("#courseGradeColumn").text(data.gradeName);
        }
    });

}


class SettingsOverlay extends OverlayContext {
    #editController;
    #currentData;

    constructor() {
        super({
            overlayName: "Settings",
            overlayElement: $("#Settings")
        });

        this.#editController = new EditController({
            editButton: $("#editSettings"),
            inputElements: $("#Settings input[type=text]"),
            acceptButton: $("#acceptSettingsChanges"),
            acceptChanges: () => { this.#acceptSettingsChanges(); },
            cancelButton: $("#cancelSettingsChanges"),
            cancelChanges: () => { this.#cancelSettingsChanges(); },
            viewElements: [ $("#settingsViewButtons") ],
            editElements: [ $("#settingsEditButtons") ]
        });
    }

    _activateOverlay() {
        this.#editController.enableEditMode(false);

        Cpi.SendApiRequest({
            method: "GET",
            url: "/@/organization",
            success: (data, status, xhr) => {
                this.#currentData = data;
                this.#setOverlayData(this.#currentData);
            }
        });
    }

    #acceptSettingsChanges() {
        const data = {
            organizationName: $("#organizationName").val()
        };

        Cpi.SendApiRequest({
            method: "PATCH",
            url: "/@/organization",
            data: JSON.stringify(data),
            success: (data) => {
                this.#currentData = data;
                this.#setOverlayData(this.#currentData);
            }
        })
    }

    #cancelSettingsChanges() {
        this.#setOverlayData(this.#currentData);
    }

    #setOverlayData(data) {
        $("#organizationName").val(data.organizationName);
    }
}


/*
* Calendar Overlay
*/

class CalendarOverlay extends OverlayContext {
    #calendarEditController;
    #holidayTableController;
    #currentData;
    #isNewCalendar = false;

    constructor() {
        super({
            overlayName: "Calendar",
            overlayElement: $("#Calendar")
        });

        this.#calendarEditController = new CalendarEditController(this);
        this.#holidayTableController = new HolidayTableController();

        $("#addCalendar").on("click", () => {
            this.#isNewCalendar = true;

            this.#setOverlayData(undefined);

            this.#calendarEditController.enableEditMode(true);
        });
    }

    acceptChanges() {

    }

    cancelChanges() {
        this.#setOverlayData(this.#currentData);
    }

    /*
    * Overlay overrides
    */
    _activateOverlay() {
        super._activateOverlay();

        this.#calendarEditController.enableEditMode(false);

        Cpi.SendApiRequest({
            method: "GET",
            url: "@/calendar",
            success: (data, status, xhr) => {
                this.#currentData = data;
                this.#setOverlayData(this.#currentData);
            }
        });
    }

    #setOverlayData(data) {
        if (data) {
            $("#calendarName").val(data.calendarName);
            $("#calendarStartDate").val(data.startDate);
            $("#calendarEndDate").val(data.endDate);
    
            this.#holidayTableController.setRows(data.holidays);
        }
        else {
            $("#calendarName").val("");
            $("#calendarStartDate").val("");
            $("#calendarEndDate").val("");

            this.#holidayTableController.findRows("td.holidayDateColumn").text("");
        }
    }
}

class CalendarEditController extends EditController {
    #calendarOverlay;

    constructor(calendarOverlay) {
        super({
            editButton: $("#editCalendar"),
            inputElements: $("#Calendar input[type=text]"),
            acceptButton: $("#acceptCalendarChanges"),
            acceptChanges: () => { this.#calendarOverlay.acceptChanges(); },
            cancelButton: $("#cancelCalendarChanges"),
            cancelChanges: () => { this.#calendarOverlay.cancelChanges(); },
            viewElements: [ $("#calendarViewButtons") ],
            editElements: [ $("#calendarEditButtons"), $("#holidayActionCommands") ],
        });

        this.#calendarOverlay = calendarOverlay;
    }

    enableEditMode(enable) {
        super.enableEditMode(enable);

        if (enable) {
            $(".holidayListRow").addClass("holidayListRow_active");
        }
        else {
            $(".holidayListRow").removeClass("holidayListRow_active");
        }
    }
}

class HolidayTableController extends TableController {
    constructor() {
        super({
            entityBroker: new HolidayBroker(),

            entityCaption: "Holiday",
            table: $("#holidayTable"),
            addButton: $("#addHoliday"),
            editButton: $("#editHoliday"),
            deleteButton: $("#deleteHoliday"),
            editor: $("#holidayEditor")
        });
    }

    /*
    * Protected Members
    */
    _formatRow(row, data) {
        row.find("#holidayNameColumn").text(data[0]);
        row.find("#holidayStartDateColumn").text(Cpi.FormatShortDateString(data[1]));
        row.find("#holidayEndDateColumn").text(Cpi.FormatShortDateString(data[2] || data[1]));
    }

    _onClickRow(row) {
        if (row.hasClass("holidayListRow_active")) {
            super._onClickRow(row);
        }
    }

    _getEditorData(editor) {
        const data = {
            holidayName: editor.find("#holidayName").val(),
            startDate: editor.find("#startDate").val(),
            endDate: editor.find("#endDate").val()
        };
        return data;
    }

    _setEditorData(editor, data) {
        if (data) {
            editor.find("#holidayName").val(data.holidayName);
            editor.find("#startDate").val(data.startDate);
            editor.find("#endDate").val(data.endDate);
        }
        else {
            editor.find("#holidayName").val("");
            editor.find("#startDate").val("");
            editor.find("#endDate").val("");
        }
    }
}

class HolidayBroker extends EntityBroker {
    constructor() {
        super();
    }

    fetchEntity(row, success) {
        const data = {
            holidayName: row.find("#holidayNameColumn").text(),
            startDate: row.find("#holidayStartDateColumn").text(),
            endDate: row.find("#holidayEndDateColumn").text()
        };

        success(data);
    }

    insertEntity(data, success) {
        success(data);
    }

    updateEntity(row, data, success) {
        success(data);
    }

    deleteEntity(row, success) {
    }
}


class TableOverlay extends OverlayContext {
    #tableController;

    constructor(settings) {
        super(settings);

        this.#tableController = new TableController(settings);
        this.#tableController._formatRow = this._formatRow || this.#tableController._formatRow;
        this.#tableController._compareRows = this._compareRows || this.#tableController._compareRows;
        this.#tableController.insertEntity = this.insertEntity || this.#tableController.insertEntity;
        this.#tableController.updateEntity = this.updateEntity || this.#tableController.updateEntity;
        this.#tableController.deleteEntity = this.deleteEntity || this.#tableController.deleteEntity;
        this.#tableController._getEditorData = this._getEditorData || this.#tableController._getEditorData;
        this.#tableController._setEditorData = this._setEditorData || this.#tableController._setEditorData;
    }

    get tableController() {
        return this.#tableController;
    }

    _activateOverlay() {
        super._activateOverlay();
        this.#tableController.refreshRows();
    }
}


class StudentOverlay extends TableOverlay {
    constructor() {
        super({
            overlayName: "Students",
            overlayElement: $("#Students"),

            entityBroker: OrganizationPage.StudentBroker,

            entityCaption: "Student",
            table: $("#studentTable"),
            addButton: $("#addStudent"),
            editButton: $("#editStudent"),
            deleteButton: $("#deleteStudent"),
            toggleButtons: [ $("#assignStudentClasses") ],
            editor: $("#studentEditor")
        });
    }

    _formatRow(row, student) {
        row.attr("id", student.studentId);
        row.find("#studentNameColumn").text(`${student.lastName}, ${student.firstName}`);
        row.find("#studentNumberColumn").text(student.studentNumber || "");
        row.find("#studentGradeColumn").text(student.gradeName || "");
        row.find("#studentLocationColumn").text(student.locationName);
    }

    _compareRows(lhs, rhs) {
        const left = $(lhs).find("#studentNameColumn").text();
        const right = $(rhs).find("#studentNameColumn").text();
        return left.localeCompare(right);
    }

    _getEditorData(editor) {
    }

    _setEditorData(editor, data) {
    }
}


class AccountOverlay extends TableOverlay {
    constructor() {
        super({
            overlayName: "Accounts",
            overlayElement: $("#Accounts"),

            entityBroker: OrganizationPage.AccountBroker,

            entityCaption: "Account",
            listUrl: "/@/accounts?columns=accountId,lastName,firstName,accessType,statusType",
            table: $("#accountTable"),
            addButton: $("#addAccount"),
            editButton: $("#editAccount"),
            deleteButton: $("#deleteAccount"),
            toggleButtons: [ $("#sendAccountInvite"), $("#assignAccountClasses") ],
            editor: $("#accountEditor")
        });

        $("#sendAccountInvite").on("click", () => {
            const row = this.getSelectedRow();
            if (row) {
                const params = {
                    accountId: row.attr("id")
                };
                Cpi.SendApiRequest({
                    method: "POST",
                    url: "/@/account/invitation",
                    data: JSON.stringify(params),
                    success: (data) => {
                        const registrationUrl = `${window.location.protocol}//${window.location.host}/`
                        Cpi.ShowAlert()
                    }
                });
    
            }

        });
    }

    _formatRow(row, account) {
        row.attr("id", account.accountId);
        row.find("#accountNameColumn").text(`${account.lastName}, ${account.firstName}`);
        row.find("#accountAccessColumn").text(account.accessType);
        row.find("#accountStatusColumn").text(account.statusType);
    }

    _compareRows(lhs, rhs) {
        const left = $(lhs).find("#accountNameColumn").text();
        const right = $(rhs).find("#accountNameColumn").text();
        return left.localeCompare(right);
    }

    _getEditorData(editor) {
        return {
            email: editor.find("#email").val(),
            accessType: editor.find("#accessType").val(),
            statusType: editor.find("#statusType").val()
        };
    }

    _setEditorData(editor, data) {
        if (data) {
            editor.find("#email").val(data.email);
            editor.find("#accessType").val(data.accessType);
            editor.find("#statusType").val(data.statusType);
        }
        else {
            editor.find("#email").val("");
            editor.find("#accessType").val("");
            editor.find("#statusType").val("");
        }
    }
}


class ClassOverlay extends TableOverlay {
    constructor() {
        super({
            overlayName: "Classes",
            overlayElement: $("#Classes"),

            entityBroker: OrganizationPage.ClassBroker,

            entityCaption: "Class",
            table: $("#classTable"),
            addButton: $("#addClass"),
            editButton: $("#editClass"),
            deleteButton: $("#deleteClass"),
            deleteButton: $("#deleteClass"),
            toggleButtons: [ $("#assignClassStudents"), $("#assignClassCourses") ],
            editor: $("#classEditor")
        });

        $("#assignClassCourses").on("click", () => {
            this.#showCourseOptions();
        });
    }

    _formatRow(row, classData) {
        row.attr("id", classData.classId);
        row.find("#classNameColumn").text(classData.className);
        row.find("#classTeacherColumn").text(classData.teacherLastName ? `${classData.teacherLastName}, ${classData.teacherFirstName}` : "");
        row.find("#classLocationColumn").text(classData.locationName);
    }

    _compareRows(lhs, rhs) {
        const left = $(lhs).find("#classNameColumn").text();
        const right = $(rhs).find("#classNameColumn").text();
        return left.localeCompare(right);
    }

    _getEditorData(editor) {
    }

    _setEditorData(editor, data) {
    }

    #showCourseOptions() {
        const selectedRow = this.tableController.getSelectedRow();
        if (selectedRow) {
            OrganizationPage.CoursePicker.show({
                listUrl: `/@/class/courses?classId=${selectedRow.attr("id")}`,
                accept: (selection) => {
                    this.#assignCourses(selection);
                }
            });
        }
    }
    #assignCourses(selection) {
        const selectedRow = this.tableController.getSelectedRow();
        if (selectedRow) {
            const classId = selectedRow.attr("id");

            const params = {
                courses: []
            }
    
            if (selection) {
                for (const current of selection) {
                    params.courses.push(current.attr("id"));
                }
            }
    
            Cpi.SendApiRequest({
                method: "PUT",
                url: `/@/class/courses?classId=${selectedRow.attr("id")}`,
                data: JSON.stringify(params)
            });
        }
    }
}

class CourseOverlay extends TableOverlay {
    constructor() {
        const editor = $("#courseEditor");

        super({
            overlayName: "Courses",
            overlayElement: $("#Courses"),

            entityBroker: OrganizationPage.CourseBroker,

            entityCaption: "Course",
            table: $("#courseTable"),
            addButton: $("#addCourse"),
            editButton: $("#editCourse"),
            deleteButton: $("#deleteCourse"),
            toggleButtons: [ $("#assignCourseClasses") ],
            editor: editor
        });

        const subjectDropdown = editor.find("#courseSubject");
        for (const subjectName of cpidata.organization.curriculum.search.subjects) {
            subjectDropdown.append(`<option>${subjectName}</option>`);
        }
    }

    _formatRow(row, course) {
        row.attr("id", course.courseId);
        row.find("#courseNameColumn").text(course.courseName);
        row.find("#courseSubjectColumn").text(course.subjectName || "");
        row.find("#courseGradeColumn").text(course.gradeName || "");
    }

    _compareRows(lhs, rhs) {
        const left = $(lhs).find("#courseNameColumn").text();
        const right = $(rhs).find("#courseNameColumn").text();
        return left.localeCompare(right);
    }

    _getEditorData(editor) {
        return {
            courseName: editor.find("#courseName").val(),
            subjectName: editor.find("#courseSubject").val(),
            gradeName: editor.find("#courseGrade").val()
        };
    }

    _setEditorData(editor, data) {
        if (data) {
            editor.find("#courseName").val(data.courseName);
            editor.find("#courseSubject").val(data.subjectName);
            editor.find("#courseGrade").val(data.gradeName);
        }
        else {
            editor.find("#courseName").val("");
            editor.find("#courseSubject").val("");
            editor.find("#courseGrade").val("");
        }
    }
}


class LocationOverlay extends TableOverlay {
    constructor() {
        super({
            overlayName: "Locations",
            overlayElement: $("#Locations"),

            entityBroker: OrganizationPage.LocationBroker,

            entityCaption: "Location",
            table: $("#locationTable"),
            addButton: $("#addLocation"),
            editButton: $("#editLocation"),
            deleteButton: $("#deleteLocation"),
            editor: $("#locationEditor")
        });
    }

    _formatRow(row, location) {
        row.attr("id", location.locationId);
        row.find("#locationNameColumn").text(location.locationName);
    }

    _compareRows(lhs, rhs) {
        const left = $(lhs).find("#locationNameColumn").text();
        const right = $(rhs).find("#locationNameColumn").text();
        return left.localeCompare(right);
    }

    _getEditorData(editor) {
    }

    _setEditorData(editor, data) {
    }
}


window.page = new OrganizationPage();