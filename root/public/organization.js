

class OrganizationPage extends CpiPage {
    #overlayController;

    constructor() {
        super();
        
        if (!this.validateLogin()) {
            return;
        }

        const overlays = [
            new SettingsOverlay(),
            new CalendarOverlay(),
            //new StudentOverlay(),
            new AccountOverlay(),
            new ClassOverlay(),
            new CourseOverlay(),
            new LocationOverlay(),
            new CurriculumOverlay()
        ];
        this.#overlayController = new OverlayController(overlays, "organizationOverlayName");

        Cpi.ShowAppFrame();
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

    /* Selectors */
    static #LocationOptions = [];
    static #TeacherOptions = [];

    // Location Options
    static PopulateLocationOptions(selector, next) {
        if (!OrganizationPage.#LocationOptions.length) {
            Cpi.SendApiRequest({
                method: "GET",
                url: "/@/locations",
                success: (data, status, xhr) => {
                    for (const current of data) {
                        OrganizationPage.#LocationOptions.push({
                            id: current.locationId,
                            name: current.locationName
                        });
                    }
                    OrganizationPage.#PopulateSelector(selector, OrganizationPage.#LocationOptions);
                    if (next) {
                        next();
                    }
                }
            });
        }
        else {
            OrganizationPage.#PopulateSelector(selector, OrganizationPage.#LocationOptions);
            if (next) {
                next();
            }
        }
    }
    static ClearLocationOptions() {
        OrganizationPage.#LocationOptions = [];
    }

    // Teacher Options
    static PopulateTeacherOptions(selector, next) {
        if (!OrganizationPage.#TeacherOptions.length) {
            OrganizationPage.#TeacherOptions.push({
                id: null,
                name: ""
            });

            Cpi.SendApiRequest({
                method: "GET",
                url: "/@/accounts?accessType=teacher",
                success: (data, status, xhr) => {
                    for (const current of data) {
                        OrganizationPage.#TeacherOptions.push({
                            id: current.accountId,
                            name: `${current.lastName}, ${current.firstName}`
                        });
                    }
                    OrganizationPage.#PopulateSelector(selector, OrganizationPage.#TeacherOptions);
                    if (next) {
                        next();
                    }
                }
            });
        }
        else {
            OrganizationPage.#PopulateSelector(selector, OrganizationPage.#TeacherOptions);
            if (next) {
                next();
            }
        }
    }
    static ClearTeacherOptions() {
        OrganizationPage.#TeacherOptions = [];
    }


    static #PopulateSelector(selector, options) {
        selector.empty();
        for (const current of options) {
            selector.append(OrganizationPage.#CreateOption(current.id, current.name));
        }
    }
    static #CreateOption(value, text) {
        const option = $(document.createElement("option"));
        option.val(value);
        option.text(text);
        return option;
    }
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
            parent: this.element,
            inputElements: this.element.find("input[type=text]"),
            acceptChanges: () => { this.#acceptSettingsChanges(); },
            cancelChanges: () => { this.#cancelSettingsChanges(); },
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
                super._activateOverlay();
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
        const data = {
            calendarName: this.element.find("#calendarName").val(),
            startDate: Cpi.ShortDateToIsoString(this.element.find("#calendarStartDate").val()),
            endDate: Cpi.ShortDateToIsoString(this.element.find("#calendarEndDate").val()),
            holidays: this.#holidayTableController.getHolidays()
        };

        var method, url;
        if (this.#isNewCalendar) {
            method = "PUT";
            url = "/@/calendar";
        }
        else {
            method = "PATCH";
            url = `/@/calendar/${this.#currentData.calendarId}`;
        }

        // Check if new or update.
        Cpi.SendApiRequest({
            method: method,
            url: url,
            data: JSON.stringify(data),
            success: (data) => {
                this.#currentData = data;
                this.#setOverlayData(this.#currentData);
            }
        })
    }

    cancelChanges() {
        this.#setOverlayData(this.#currentData);
    }

    /*
    * Overlay overrides
    */
    _activateOverlay() {
        this.#calendarEditController.enableEditMode(false);

        Cpi.SendApiRequest({
            method: "GET",
            url: "@/calendar",
            success: (data, status, xhr) => {
                this.#currentData = data;
                this.#setOverlayData(this.#currentData);
                super._activateOverlay();
            }
        });
    }

    #setOverlayData(data) {
        if (data) {
            $("#calendarName").val(data.calendarName);
            $("#calendarStartDate").val(Cpi.FormatShortDateString(data.startDate));
            $("#calendarEndDate").val(Cpi.FormatShortDateString(data.endDate));
    
            this.#holidayTableController.setRows(data.holidays);
        }
        else {
            $("#calendarName").val("");
            $("#calendarStartDate").val("");
            $("#calendarEndDate").val("");

            this.#holidayTableController.findRows("td.holidayDateColumn").text("");
        }

        this.#isNewCalendar = false;
    }
}

class CalendarEditController extends EditController {
    #calendarOverlay;

    constructor(calendarOverlay) {
        super({
            parent: calendarOverlay.element,
            inputElements: calendarOverlay.element.find("input[type=text]"),
            acceptChanges: () => { this.#calendarOverlay.acceptChanges(); },
            cancelChanges: () => { this.#calendarOverlay.cancelChanges(); },
            inactiveButtons: [ $("#calendarViewButtons") ],
            activeButtons: [ $("#calendarEditButtons"), $("#holidayActionCommands") ],
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

    getHolidays() {
        const holidays = [];

        const rows = this.getRows();
        for (const current of rows) {
            const row = $(current);
            const holiday = [
                row.find("#holidayNameColumn").text(),
                Cpi.ShortDateToIsoString(row.find("#holidayStartDateColumn").text()),
                Cpi.ShortDateToIsoString(row.find("#holidayEndDateColumn").text()),
            ]

            holidays.push(holiday);
        }

        return holidays;
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
    _onDoubleClickRow(row) {
        if (row.hasClass("holidayListRow_active")) {
            super._onDoubleClickRow(row);
        }
    }

    _getEditorData(editor) {
        const data = [
            editor.find("#holidayName").val(),
            Cpi.ShortDateToIsoString(editor.find("#startDate").val()),
            Cpi.ShortDateToIsoString(editor.find("#endDate").val())
        ];
        return data;
    }

    _setEditorData(editor, data) {
        if (data) {
            editor.find("#holidayName").val(data[0]);
            editor.find("#startDate").val(Cpi.FormatShortDateString(data[1]));
            editor.find("#endDate").val(Cpi.FormatShortDateString(data[2]));
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
        const data = [
            row.find("#holidayNameColumn").text(),
            Cpi.ShortDateToIsoString(row.find("#holidayStartDateColumn").text()),
            Cpi.ShortDateToIsoString(row.find("#holidayEndDateColumn").text())
        ];
        success(data);
    }

    insertEntity(data, success) {
        success(data);
    }

    updateEntity(row, data, success) {
        success(row, data);
    }

    deleteEntity(row, success) {
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
            toggleButtons: [ $("#sendAccountInvite"), $("#viewTeacherSchedule"), $("#viewTeacherRoadmap"), $("#assignAccountClasses") ],
            editor: $("#accountEditor")
        });

        $("#sendAccountInvite").on("click", () => {
            this.#sendInvite();
        });

        $("#viewTeacherSchedule").on("click", (event) => {
            this.#viewAccountDetail("schedule", event.ctrlKey);
        });
        $("#viewTeacherRoadmap").on("click", (event) => {
            this.#viewAccountDetail("roadmap", event.ctrlKey);
        });
    }

    _formatRow(row, account) {
        row.attr("id", account.accountId);
        row.find("#accountEmailColumn").text(account.email);
        row.find("#accountAccessColumn").text(account.accessType);
        row.find("#accountStatusColumn").text(account.statusType);

        if (account.lastName && account.firstName) {
            row.find("#accountNameColumn").text(`${account.lastName}, ${account.firstName}`);
        }
    }

    _compareRows(lhs, rhs) {
        const left = $(lhs).find("#accountNameColumn").text();
        const right = $(rhs).find("#accountNameColumn").text();
        return left.localeCompare(right);
    }

    _getEditorData(editor) {
        return {
            firstName: editor.find("#firstName").val(),
            lastName: editor.find("#lastName").val(),
            email: editor.find("#email").val(),
            authName: editor.find("#email").val(),
            accessType: editor.find("#accessType").val(),
            statusType: editor.find("#statusType").val()
        };
    }

    _setEditorData(editor, data) {
        if (data) {
            editor.find("#firstName").val(data.firstName);
            editor.find("#lastName").val(data.lastName);
            editor.find("#email").val(data.email);
            editor.find("#accessType").val(data.accessType);
            editor.find("#statusType").val(data.statusType);
        }
        else {
            editor.find("#firstName").val("");
            editor.find("#lastName").val("");
            editor.find("#email").val("");
            editor.find("#accessType").val("");
            editor.find("#statusType").val("");
        }
    }

    #sendInvite() {
        const row = this.tableController.getSelectedRow();
        if (row) {
            const params = {
                accountId: row.attr("id")
            };
            Cpi.SendApiRequest({
                method: "POST",
                url: "/@/account/invitation",
                data: JSON.stringify(params),
                success: (data) => {
                    row.find("#accountStatusColumn").text(data.statusType);
                    Cpi.ShowAlert(data.registrationUrl);
                }
            });
        }
    }

    #viewAccountDetail(pathname, openNewTab) {
        const row = this.tableController.getSelectedRow();
        const teacherId = row.attr("id");
        const teacherName = row.find("#accountNameColumn").text();
        window.open(`/${pathname}?tid=${teacherId}&tname=${teacherName}`, openNewTab ? "_blank" : "_self");
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

    _activateOverlay() {
        const locationSelector = this.tableController.editor.find("#classLocation");
        const teacherSelector = this.tableController.editor.find("#classTeacher");

        OrganizationPage.PopulateLocationOptions(locationSelector, () => {
            OrganizationPage.PopulateTeacherOptions(teacherSelector, () => {
                super._activateOverlay();
            });
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
        const className = editor.find("#className").val();
        const locationId = editor.find("#classLocation").val();
        const teacherId = editor.find("#classTeacher").val();

        return {
            className: className,
            locationId: locationId === "" ? null : locationId,
            teacherId: teacherId === "" ? null : teacherId
        };
    }

    _setEditorData(editor, data) {
        if (data) {
            editor.find("#className").val(data.className);
            editor.find("#classLocation").val(data.locationId);
            editor.find("#classTeacher").val(data.teacherId);
        }
        else {
            editor.find("#className").val("");
            editor.find("#classLocation").val("");
            editor.find("#classTeacher").val("");
        }
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

        // Initialize subject and grade editor selectors
        const subjectDropdown = editor.find("#courseSubject");
        for (const subject of cpidata.organization.curriculum.search.subjects) {
            const option = document.createElement("option");
            option.text = subject.name;
            option.grades = subject.grades;
            subjectDropdown.append(option);
        }
        this.#syncGradeOptions();
    }

    get editor() {
        return this.tableController.editor;
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

    #syncGradeOptions() {
        const subject = this.editor.find("#courseSubject").find(":selected");
        if (subject.length) {
            const selector = this.editor.find("#courseGrade");
            selector.empty();

            for (const grade of subject[0].grades) {
                selector.append(`<option>${grade}</option`);
            }
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
        return {
            locationName: editor.find("#locationName").val()
        };
    }

    _setEditorData(editor, data) {
        if (data) {
            editor.find("#locationName").val(data.locationName);
        }
        else {
            editor.find("#locationName").val("");
        }
    }
}


class CurriculumOverlay extends TableOverlay {
    #initialized = false;
    #overlayData;
    #subjectSelector;
    #gradeSelector;
    #scopeSelector;

    constructor() {
        super({
            overlayName: "Curriculum",
            table: $("#curriculumTable")
        });

        const pageDataItem = localStorage.getItem("curriculumOverlay");
        if (pageDataItem) {
            this.#overlayData = JSON.parse(pageDataItem);
        }
        else {
            this.#overlayData = {
                selectors: {
                    lastSubject: "",
                    lastGrade: "",
                    lastScope: "all"
                }
            };
        }

        /* Navigation Seelectors */
        this.#subjectSelector = $("#curriculumSubjectSelector");
        this.#subjectSelector.on("change", () => {
            this.#overlayData.selectors.lastSubject = this.#subjectSelector.val();
            this.#saveOverlayData();
            this.#initGradeOptions();
            this.#queryCurriculum();
        });

        this.#gradeSelector = $("#curriculumGradeSelector");
        this.#gradeSelector.on("change", () => {
            this.#overlayData.selectors.lastGrade = this.#gradeSelector.val();
            this.#saveOverlayData();
            this.#queryCurriculum();
        });

        this.#scopeSelector = $("#curriculumScopeSelector");
        this.#scopeSelector.on("change", () => {
            this.#overlayData.selectors.lastScope = this.#scopeSelector.val();
            this.#saveOverlayData();
            this.#queryCurriculum();
        });

        /* Edit Buttons */
        this.element.find("#curriculumEdit").on("click", () => {
            this.#showEditButtons(true);
        });

        this.element.find("#curriculumSave").on("click", () => {
            this.#saveCurriculumChanges();
        });

        this.element.find("#curriculumCancel").on("click", () => {
            this.#queryCurriculum();
            this.#showEditButtons(false);
        });

        this.element.find("#curriculumSelectAll").on("click", () => {
            this.element.find(".curriculumCheckbox").prop("checked", true);
        });

        this.element.find("#curriculumDeselectAll").on("click", () => {
            this.element.find(".curriculumCheckbox").prop("checked", false);
        });

        this.element.find("#curriculumUpload").on("click", () => {
            Cpi.UploadFile(
                "/@/organization/curriculum/import",
                "Upload Curriculum", 
                (data) => {
                    this.#queryCurriculum();
                }
            );
        });

        this.element.find("#curriculumDownload").on("click", () => {
            Cpi.DownloadFile("/@/organization/curriculum/export", "curriculum.csv");
        });
    }

    _activateOverlay() {
        if (this.#initialized) {
            this.#queryCurriculum();
        }
        else {
            Cpi.SendApiRequest({
                method: "GET",
                url: "/@/organization/curriculum/options",
                success: (data) => {
                    this.#initSubjectOptions(data);
                    this.#queryCurriculum();
                }
            });
        }
    }

    _deactivateOverlay() {
        super._deactivateOverlay();
        this.#showEditButtons(false);
    }

    /*
    * Private
    */
    #initSubjectOptions(subjects) {
        this.#subjectSelector.empty();

        for (const subject of subjects) {
            const option = document.createElement("option");
            option.text = subject.name;
            option.grades = subject.grades;
            this.#subjectSelector.append($(option));
        }

        if(this.#subjectSelector.val(this.#overlayData.selectors.lastSubject).val() !== this.#overlayData.selectors.lastSubject) {
            this.#overlayData.selectors.lastSubject = this.#subjectSelector.find(":first").val();
            this.#subjectSelector.val(this.#overlayData.selectors.lastSubject);
            this.#saveOverlayData();
        }

        this.#initGradeOptions();
    }

    #initGradeOptions() {
        const selectedSubject = this.#subjectSelector.find(":selected");

        if (selectedSubject.length) {
            const grades = selectedSubject[0].grades;

            this.#gradeSelector.empty();
            
            for (const grade of grades) {
                const option = document.createElement("option");
                option.value = option.text = grade;
                this.#gradeSelector.append(option);
            }

            if(this.#gradeSelector.val(this.#overlayData.selectors.lastGrade).val() !== this.#overlayData.selectors.lastGrade) {
                this.#overlayData.selectors.lastGrade = this.#gradeSelector.find(":first").val();
                this.#gradeSelector.val(this.#overlayData.selectors.lastGrade);
                this.#saveOverlayData();
            }
        }
    }

    #saveOverlayData() {
        localStorage.setItem("curriculumOverlay", JSON.stringify(this.#overlayData));
    }

    #queryCurriculum() {
        Cpi.SendApiRequest({
            method: "GET",
            url: `/@/organization/curriculum?subject=${this.#overlayData.selectors.lastSubject}&grade=${this.#overlayData.selectors.lastGrade}&scope=${this.#overlayData.selectors.lastScope}`,
            success: (data) => {
                this.#populateCurriculumTable(data);
            }
        });

        super._activateOverlay();
    }

    #populateCurriculumTable(data) {
        this.tableController.setRows(data);
    }
    _formatRow(row, benchmark) {
        row.attr("id", benchmark.id);

        const checkbox = row.find("#curriculumCheckbox");
        checkbox
            .attr("id", benchmark.id)
            .prop("checked", benchmark.assigned)
            .on("change", () => {
                this.#syncRowColors(row, checkbox.prop("checked") == true);
            })
            .on("click", (event) => {
                event.stopPropagation();
            });

        row.find("#curriculumStandardCode")
            .text(benchmark.code)
            .attr("href", benchmark.url)
            .on("click", (event) => {
                event.stopPropagation();
            });

        row.find("#curriculumSynopsis").html(benchmark.synopsis);

        row.on("click", () => {
            checkbox.trigger("click");
        })

        this.#syncRowColors(row, benchmark.assigned);
    }

    #syncRowColors(row, assigned) {
        if (assigned) {
            row.find("#curriculumSynopsis").addClass("curriculumSynopsis_assigned");
        }
        else {
            row.find("#curriculumSynopsis").removeClass("curriculumSynopsis_assigned");
        }
    }

    #saveCurriculumChanges() {
        const assigned = [], unassigned = [];

        const checkboxes = this.element.find(".curriculumCheckbox");
        for (const element of checkboxes) {
            const checkbox = $(element);
            if (checkbox.prop("checked")) {
                assigned.push(checkbox.attr("id"));
            }
            else {
                unassigned.push(checkbox.attr("id"));
            }
        }

        const params = {
            subject: this.#overlayData.selectors.lastSubject,
            grade: this.#overlayData.selectors.lastGrade,
            assigned: assigned,
            unassigned: unassigned
        };

        Cpi.SendApiRequest({
            method: "PUT",
            url: "/@/organization/curriculum",
            data: JSON.stringify(params),
            success: (data) => {
                this.#showEditButtons(false);
            }
        });
    }

    #showEditButtons(show) {
        $("#curriculumEditCommands").css("display", show ? "block" : "none");
        $("#curriculumNonEditCommands").css("display", !show ? "block" : "none");
    }
}


window.page = new OrganizationPage();