

/*
* SchedulePage
*/
class SchedulePage extends CpiPage {
    #lessonTemplate = $(".scheduleLesson").detach();
    #coursePicker;
    #weekNumber;
    #weekDates;
    #viewTracker;

    constructor() {
        super();

        if (!this.validateLogin()) {
            return;
        }

        this.#coursePicker = new CoursePicker(this);

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
                this.#viewWeek(newWeekNumber);
            }
        });

        if (this.#weekNumber > 1) {
            $("#viewPreviousWeek").on("click", () => { this.#viewWeek(this.#weekNumber - 1); });
        }
        else {
            $("#viewPreviousWeek").prop("disabled", true);
        }

        if (this.#weekNumber !== Cpi.GetCurrentWeekNumber()) {
            $("#viewCurrentWeek").on("click", () => { this.#viewWeek(); });
        }
        else {
            $("#viewCurrentWeek").prop("disabled", true);
        }

        if (this.#weekNumber < Cpi.GetLastWeekNumber()) {
            $("#viewNextWeek").on("click", () => { this.#viewWeek(this.#weekNumber + 1); });
        }
        else {
            $("#viewNextWeek").prop("disabled", true);
        }

        // Initialize column headers.
        const today = Cpi.GetTodayDate();
        var containerDate = this.#weekDates.start;
        const columns = $(".scheduleColumn");
        for (const current of columns) {
            const column = $(current);
            const container = column.find(".scheduleLessonContainer");
            const lessonDate = containerDate;

            column.find(".scheduleColumnDate").text(Cpi.FormatShortDateString(lessonDate));

            // Handle holiday
            if (Cpi.IsHoliday(lessonDate)) {
                column.find(".scheduleColumnHeader").addClass("scheduleColumnHeader_holiday")
                column.find(".scheduleColumnDay").addClass("scheduleColumn_holiday");
                column.find(".scheduleColumnDate").addClass("scheduleColumn_holiday");
                column.find("#addLesson").css("visibility", "hidden").prop("holiday", true);
                column.find("#repeatColumn").css("visibility", "hidden");
            }
            // Else, do regular school day.
            else {
                if (this.#viewTracker.teacherId) {
                    column.find("#addLesson").css("display", "none");
                    column.find("#repeatColumn").css("display", "none");    
                }
                else {
                    column.find("#addLesson").on("click", () => { this.#onAddLesson(lessonDate); });
                    column.find("#repeatColumn").on("click", () => { this.#onRepeatColumn(lessonDate); });
                }
            }

            if (lessonDate.getTime() === today.getTime()) {
                column.find(".scheduleColumnHeader").addClass("scheduleColumnHeader_today");
            }
            
            containerDate = Cpi.DateAdd(containerDate, 1);
        }

        $(".appFrame").on("mousedown", () => {
            this.#selectLesson(undefined);
        });

        // Initialize template manager.
        new TemplateManager(this);

        //
        Cpi.ShowAppFrame();
        
        // Query lessons.
        var queryUrl = `/@/lessons?start=${Cpi.FormatIsoDateString(this.#weekDates.start)}&end=${Cpi.FormatIsoDateString(this.#weekDates.end)}`;
        if (this.#viewTracker.isActive) {
            queryUrl += `&teacherId=${this.#viewTracker.teacherId}`;
        }

        Cpi.SendApiRequest({
            method: "GET",
            url: queryUrl,
            success: (data, status, xhr) => {
                this.populateSchedule(data);

                // Update insert-lesson button visibility.
                this.#syncInsertButtons();

                // Conditionally set the current selection.
                const url = new URL(document.referrer);
                if (url.pathname === "/lesson") {
                    const lessonId = url.searchParams.get("id");
                    if (lessonId) {
                        this.#selectLesson($(`#${lessonId}`));
                    }
                }
            }
        });
    }

    get viewTracker() {
        return this.#viewTracker;
    }

    get weekNumber() {
        return this.#weekNumber;
    }

    populateSchedule(data, clear) {
        const containers = $(".scheduleLessonContainer");

        if (clear) {
            for (const current of containers) {
                $(current).empty();
            }
        }

        for (const current of data) {
            const lessonDate = Cpi.ParseLocalDate(current.lessonDate);
            const containerId = this.#calcContainerId(lessonDate);

            const lesson = this.#lessonTemplate.clone(true);

            lesson.attr("id", current.lessonId);
            lesson.attr("courseId", current.courseId);
            lesson.attr("classId", current.classId);
            lesson.attr("lessonSequence", current.lessonSequence);
            lesson.attr("href", `/lesson?id=${current.lessonId}`);
    
            // Init name.
            lesson.find("#scheduleLessonName").text(current.lessonName);

            // Init detail list.
            this.#initLessonDetails(lesson, current);
    
            // Init command bar.
            if (!this.#viewTracker.isActive) {
                const commandBar = lesson.find(".scheduleLessonCommandBar");
                commandBar.on("mouseup", (event) => {
                    if (event.which === 1) {    // Left-click only
                        event.stopPropagation();
                    }
                });
                commandBar.find("#delete").on("click", (event) => {
                    event.stopPropagation();
                    this.#deleteLesson(lesson, containerId);
                });
                commandBar.find("#moveUp").on("click", (event) => {
                    event.stopPropagation();
                    this.#moveLesson(lesson, true);
                });
                commandBar.find("#moveDown").on("click", (event) => {
                    event.stopPropagation();
                    this.#moveLesson(lesson, false);
                });
        
    
                lesson.on("mouseenter", () => { // Show commmand bar on mouse-enter
                    commandBar.css("display", "flex");
                })
                .on("mouseleave", () => {       // Hide command bar on mouse-leave
                    commandBar.css("display", "none");
                });
            }

            lesson.on("mousedown", (event) => {
                event.stopPropagation();
                this.#selectLesson(lesson);
            })
            .on("mouseup", (event) => {
                if (event.which === 1) {  // Left click only
                    event.stopPropagation();
                    window.open(`/lesson?id=${current.lessonId}${this.#viewTracker.viewParams}`, event.ctrlKey ? "_blank" : "_self");
                }
            });

            // Add to container.
            $(containers[containerId]).append(lesson);
        }
    }

    #onAddLesson(lessonDate) {
        const containerId = this.#calcContainerId(lessonDate);
        const lessons = $(`.scheduleContainer #${containerId} .scheduleLesson`);

        const exclusions = [];
        for (const current of lessons) {
            exclusions.push($(current).attr("courseId") + $(current).attr("classId"));
        }

        this.#coursePicker.show({
            lessonDate: lessonDate,
            exclusions: exclusions,
            accept: (result) => {
                const params = {
                    lessonDate: result.lessonDate,
                    lessons: []
                }

                if (result.selection.length) {
                    for (const current of result.selection) {
                        params.lessons.push({
                            courseId: current.courseId,
                            classId: current.classId
                        });
                    }
    
                    Cpi.SendApiRequest({
                        method: "PUT",
                        url: `/@/lesson`,
                        data: JSON.stringify(params),
                        success: (results, status, xhr) => {
                            this.populateSchedule(results);

                            // Update insert-lesson button visibility.
                            this.#syncInsertButtons(containerId);
                        }
                    });
                }
            }
        });
    }

    #onRepeatColumn(lessonDate) {
        const params = {
            lessonDate: Cpi.FormatIsoDateString(lessonDate)
        };

        Cpi.SendApiRequest({
            method: "POST",
            url: "/@/lesson/repeat",
            data: JSON.stringify(params),
            success: (data) => {
                // Check if the target date is in the current week.
                const targetDate = Cpi.ParseLocalDate(data.targetDate);
                const targetWeek = Cpi.CalculateWeekNumber(targetDate);
                if (targetWeek !== Cpi.GetCurrentWeekNumber()) {
                    this.#viewWeek(targetWeek);
                }
                else {
                    // Clear out the target (next) column.
                    const containerId = Cpi.DateDiff(targetDate, this.#weekDates.start);
                    const container = $(".scheduleLessonContainer")[containerId];
                    $(container).empty();

                    // Repopulate the column.
                    this.populateSchedule(data.lessons);

                    // Update insert-lesson button visibility.
                    this.#syncInsertButtons(containerId);
                }
            }
        })
    }

    #calcContainerId(lessonDate) {
        return Cpi.DateDiff(lessonDate, this.#weekDates.start);
    }

    #viewWeek(weekNumber) {
        if (!weekNumber) {
            weekNumber = Cpi.GetCurrentWeekNumber();
        }

        window.location.href = `/schedule?week=${weekNumber}${this.#viewTracker.viewParams}`;
    }

    #deleteLesson(lesson, containerId) {
        const lessonId = lesson.attr("id");

        Cpi.SendApiRequest({
            method: "DELETE",
            url: `/@/lesson/${lessonId}`,
            success: (data, status, xhr) => {
                lesson.remove();
                this.#syncInsertButtons(containerId);
            }
        })
    }

    #moveLesson(target, moveUp) {
        const other = moveUp ? target.prev() : target.next();
        if (!other.length) {
            return;
        }

        this.#selectLesson(target);

        const targetId = target.attr("id");
        const targetSequence = target.attr("lessonSequence");
        const otherId = other.attr("id");
        const otherSequence = other.attr("lessonSequence");

        const params = [
            {
                lessonId: targetId,
                lessonSequence: otherSequence,
            },
            {
                lessonId: otherId,
                lessonSequence: targetSequence
            }
        ];

        Cpi.SendApiRequest({
            method: "PATCH",
            url: `/@/lesson?noecho`,
            data: JSON.stringify(params),
            success: (data, status, xhr) => {
                target.detach();
                if (moveUp) {
                    target.insertBefore(other);
                }
                else {
                    target.insertAfter(other);
                }

                target.attr("lessonSequence", otherSequence);
                other.attr("lessonSequence", targetSequence);
            }
        });
    }

    #selectLesson(lesson) {
        const scheduleContainer = $("#scheduleContainer");
        scheduleContainer.find(".scheduleLesson_selected").removeClass("scheduleLesson_selected");
        if (lesson) {
            lesson.addClass("scheduleLesson_selected");                
        }
    }

    #syncInsertButtons(containerId) {
        const maxCourses = this.accountData.options.courses.length;
        const buttons = $(".addLesson");
        const containers = $(".scheduleLessonContainer");

        var index, max;
        if (containerId) {
            index = containerId;
            max = index + 1;
        }
        else {
            index = 0;
            max = buttons.length;
        }

        while (index < max) {
            const button = $(buttons[index]);
            if (!button.prop("holiday")) {
                const current = $(containers[index]);
                const children = current.children();
                button.css("visibility", (children.length < maxCourses) ? "visible" : "hidden");
            }

            ++index;  
        }
    }

    #initLessonDetails(lessonBubble, lessonData) {
        if (!lessonData.details || !lessonData.details.length) {
            return;
        }

        var hintPopup, waitTimeout, detailHints, currentLabel;

        function setHintText() {
            currentLabel.addClass("scheduleLessonDetail_hover");

            const detailName = currentLabel.text();
            hintPopup.text(detailHints[detailName]);

            // Compute the hint's position.
            const bubbleRect = lessonBubble[0].getBoundingClientRect();
            const hintWidth = hintPopup.outerWidth();
            const hintLeft = bubbleRect.left + ((bubbleRect.width - hintWidth) / 2);

            hintPopup.css("top", bubbleRect.bottom - 12);
            hintPopup.css("left", hintLeft);
            hintPopup.css("display", "block");
        }
        
        const detailList = lessonBubble.find("#scheduleLessonDetailList");
        detailList.css("display", "block");
        detailList.on("mouseleave", () => {
            if (hintPopup) {
                hintPopup.css("display", "none");
                hintPopup.remove();
                hintPopup = undefined;
            }

            if (waitTimeout) {
                clearTimeout(waitTimeout);
                waitTimeout = undefined;
            }

            if (currentLabel) {
                currentLabel.removeClass("scheduleLessonDetail_hover");
            }
    });

        for (const detailName of lessonData.details) {
            // Create the detail label, e.g., "benchmark", "objectives".
            const detailLabel = $(document.createElement("div"));
            detailLabel.text(detailName);
            detailLabel.addClass("scheduleLessonDetail");

            // Display hint when user hovers over label.
            detailLabel.on("mouseenter", () => {
                if (currentLabel) {
                    currentLabel.removeClass("scheduleLessonDetail_hover");
                }
                currentLabel = detailLabel;

                // If the hint is already showing, just update the text.
                if (hintPopup) {
                    setHintText();
                }

                // Otherwise, if we're not currently waiting for timeout, start it now.
                else if (!waitTimeout) {
                    waitTimeout = setTimeout(() => {
                        // Query detail text if not yet received.
                        if (!lessonBubble[0].lessonDetails) {
                            Cpi.SendApiRequest({
                                method: "GET",
                                url: `/@/lesson/schedule/hints?id=${lessonData.lessonId}`,
                                hideSpinner: true,
                                success: (data) => {
                                    detailHints = data;

                                    // Create a new hint element
                                    hintPopup = $(document.createElement("div"));
                                    hintPopup.addClass("scheduleLessonDetailHint");
                                    $(document.body).append(hintPopup);

                                    setHintText();

                                    // Clear the timeout variable.
                                    waitTimeout = undefined;
                                }
                            });
                        }
                    },
                    550);
                }
            });

            detailList.append(detailLabel);
        }
    }
}


/*
* Template Manager
*/
class TemplateManager {
    #schedulePage;
    #templateSection;
    #templateDropdown;
    #templateContainer;
    #templateOptionTemplate;
    #savePopup;
    #managerPopup;

    constructor(schedulePage) {
        this.#schedulePage = schedulePage;

        this.#templateSection = $("#templateSection");
        this.#templateDropdown = this.#templateSection.find("#templateDropdown");
        this.#templateContainer = this.#templateDropdown.find("#templateOptionContainer");
        this.#templateOptionTemplate = this.#templateContainer.find(".templateOption").detach();

        this.#templateSection.on("mouseenter", () => {
            this.#showTemplateMenu();
        });

        this.#templateDropdown.find("#saveCurrentLayout").on("click", () => {
            this.#saveCurrentLayout();
        });
        this.#templateDropdown.find("#showTemplateManager").on("click", () => {
            this.#showTemplateManager();
        });

        if (!this.#schedulePage.viewTracker.isActive) {
            this.#templateSection.css("display", "inline-block");
        }

        this.#savePopup = new SavePopup(this);
        this.#managerPopup = new ManagerPopup(this);
    }

    get schedulePage() {
        return this.#schedulePage;
    }

    static FormatTemplateId(templateName) {
        return templateName.replace(/ /g, '-').replace(/\./g, '-');
    }

    #showTemplateMenu() {
        this.#templateContainer.empty();

        if (this.#schedulePage.accountData.templates.schedule.length) {
            for (const templateName of this.#schedulePage.accountData.templates.schedule) {
                const templateOption = this.#templateOptionTemplate.clone(true);
                templateOption.attr("id", templateName);
                templateOption
                    .text(templateName)
                    .on("click", () => {
                        this.#applyTemplate(templateOption.attr("id"));
                    });
                this.#templateContainer.append(templateOption);
            }

            this.#templateContainer.css("display", "block");
        }
        else {
            this.#templateContainer.css("display", "none");
        }

        this.#templateDropdown.css("display", "");
    }
    #hideTemplateMenu() {
        this.#templateDropdown.css("display", "none");
    }

    #saveCurrentLayout() {
        this.#hideTemplateMenu();
        this.#savePopup.show();
    }

    #applyTemplate(templateName) {
        this.#hideTemplateMenu();

        Cpi.SendApiRequest({
            method: "POST",
            url: `/@/lesson/schedule/template?action=apply&name=${templateName}&week=${this.#schedulePage.weekNumber}`,
            success: (data) => {
                this.#schedulePage.populateSchedule(data, true);
            }
        });
    }

    #showTemplateManager() {
        this.#hideTemplateMenu();
        this.#managerPopup.show();
    }
}


/*
* TemplatePopup
*/

class TemplatePopup {
    #templateManager;

    constructor(templateManager) {
        this.#templateManager = templateManager;
    }

    get templateManager() {
        return this.#templateManager;
    }
    get schedulePage() {
        return this.#templateManager.schedulePage;
    }
}


/*
* SavePopup
*/

class SavePopup extends TemplatePopup {
    #popup;
    #nameInput;
    #optionTable;

    constructor(templateManager) {
        super(templateManager);

        this.#popup = $("#saveTemplatePopup");
        this.#optionTable = new TemplateOptionTable(this.#popup.find("#templatePopupTable"));

        this.#nameInput = this.#popup.find("#templateNameInput");
        this.#nameInput.on("keydown", (event) => {
            if (event.keyCode === 13) {
                this.#popup.find("#popupAccept").trigger("click");
            }
        });
        this.#nameInput.on("focus", () => {
            this.#optionTable.selectedRow = null;
        });
    }

    show() {
        this.#nameInput.val("");

        const templates = this.schedulePage.accountData.templates.schedule;
        this.#optionTable.refresh(templates, (row, templateName) => {
            row.find("#templateName").text(templateName);

            row.on("click", () => {
                this.#nameInput.val(templateName);
            })
            .on("dblclick", () => {
                this.#popup.find("#popupAccept").trigger("click");
            });
        });
    
        Cpi.ShowPopup(
            this.#popup,
            () => {
                const templateName = this.#nameInput.val().trim();

                if (templateName !== "") {
                    Cpi.SendApiRequest({
                        method: "POST",
                        url: `/@/lesson/schedule/template?action=save&name=${templateName}&week=${this.schedulePage.weekNumber}`,
                        success: (data, status, xhr) => {
                            if (xhr.status == 201) { // Created, add to schedule templates.
                                this.schedulePage.accountData.templates.schedule.push(templateName);
                                this.schedulePage.persistAccountData();
                            }
                        }
                    });
                }
                else {
                    Cpi.ShowAlert({
                        message: "Please enter a template name.",
                        close: () => {
                            this.show();
                        }
                    });
                }
            }
        );
    }
}


/*
* ManagerPopup
*/
class ManagerPopup extends TemplatePopup {
    #popup;
    #table;
    #renameButton;
    #deleteButton;

    constructor(templateManager) {
        super(templateManager);

        this.#popup = $("#templateManagerPopup");
        this.#table = new TemplateOptionTable(this.#popup.find("#templatePopupTable"));

        this.#renameButton = this.#popup.find("#renameTemplate");
        this.#renameButton.on("click", () => {
            this.#renameTemplate()
        });

        this.#deleteButton = this.#popup.find("#deleteTemplate");
        this.#deleteButton.on("click", () => {
            this.#deleteTemplate()
        });
    }

    show() {
        this.#table.refresh(
            this.schedulePage.accountData.templates.schedule,
            (row, templateName) => {
                row.on("click", () => {
                    this.#syncButtons();
                });

                const nameInput = row.find("#templateName");
                nameInput.val(templateName)
                    .on("click", () => {
                        if (nameInput.is(":focus")) {
                            this.#commitRenameTemplate(row);
                        }
                    })
                    .on("dblclick", (event) => {
                        this.#table.selectedRow = row;
                        this.#renameButton.trigger("click");
                    })
                    .on("keydown", (event) => {
                        if (event.keyCode === 13) {
                            this.#commitRenameTemplate(row);
                        }
                        else if (event.keyCode === 27) {
                            this.#cancelEditMode(row);
                        }
                    })
                    .on("blur", () => {
                        if (!nameInput.prop("readonly")) {
                            this.#cancelEditMode(row);
                        }
                    });
            });

        this.#syncButtons();
    
        Cpi.ShowPopup(this.#popup);
    }

    #renameTemplate() {
        const selection = this.#getSelectedRow();
        if (selection) {
            const nameInput = selection.find("#templateName");
            nameInput
                .addClass("templateNameEditMode")
                .prop("readonly", false)
                .focus()
                .select();
        }
    }
    #commitRenameTemplate(selection) {
        const nameInput = selection.find("#templateName");

        const newName = nameInput.val();
        const newId = TemplateManager.FormatTemplateId(newName);

        // Check if already exists.
        const existing = this.#table.findRow(`#${newId}`);
        if (!existing.length) {

            const oldName = selection.attr("templateName");

            Cpi.SendApiRequest({
                method: "POST",
                url: `/@/lesson/schedule/template?action=rename&old=${oldName}&new=${newName}`,
                success: (data) => {
                    this.#disableEditMode(nameInput);

                    selection.attr("id", newId);
                    selection.attr("templateName", newName);

                    const scheduleTemplates = this.schedulePage.accountData.templates.schedule;
                    for (var index = 0; index < scheduleTemplates.length; index++) {
                        const current = scheduleTemplates[index];

                        if (current == oldName) {
                            scheduleTemplates[index] = newName;
                            break;
                        }
                    }
                    this.schedulePage.persistAccountData();
                }
            });
        }
        else if (existing[0] !== selection[0]) {
            Cpi.ShowAlert("A template with the same name already exists.");
        }
    }

    #deleteTemplate() {
        const selection = this.#getSelectedRow();
        if (selection) {
            const templateName = selection.find("#templateName").val();

            Cpi.SendApiRequest({
                method: "POST",
                url: `/@/lesson/schedule/template?action=delete&name=${templateName}`,
                success: () => {
                    selection.remove();

                    this.#syncButtons();

                    const scheduleTemplates = this.schedulePage.accountData.templates.schedule;
                    for (var index = 0; index < scheduleTemplates.length; index++) {
                        const current = scheduleTemplates[index];

                        if (current == templateName) {
                            scheduleTemplates.splice(index, 1);
                            break;
                        }
                    }
                    this.schedulePage.persistAccountData();
                }
            });
        }
    }

    #syncButtons() {
        const container = this.#popup.find("#templatePopupRowContainer");
        const enableButtons = (container.find(".templatePopupRow_selected").length > 0)
        this.#renameButton.prop("disabled", !enableButtons);
        this.#deleteButton.prop("disabled", !enableButtons);
    }

    #getSelectedRow() {
        const selection = this.#popup.find("#templatePopupRowContainer .templatePopupRow_selected");
        return selection.length === 1 ? selection : null;
    }

    #cancelEditMode(row) {
        const prevName = row.attr("templateName");
        const nameInput = row.find("#templateName");
        nameInput.val(prevName);
        this.#disableEditMode(nameInput);
    }
    #disableEditMode(nameInput) {
        nameInput.removeClass("templateNameEditMode");
        nameInput.prop("readonly", true);
    }
}


/*
* TemplateOptionTable
*/

class TemplateOptionTable {
    #table;
    #rowContainer;
    #rowTemplate;

    constructor(table) {
        this.#table = table;
        this.#rowContainer = this.#table.find("#templatePopupRowContainer");
        this.#rowTemplate = this.#rowContainer.find("#templatePopupRow").detach();
    }

    get selectedRow() {
        const selection = this.findRow(".templatePopupRow_selected");
        return selection.length === 1 ? selection : null;
    }
    set selectedRow(newSelection) {
        const curSelection = this.findRow(".templatePopupRow_selected");
        curSelection.removeClass("templatePopupRow_selected");

        if (newSelection) {
            if (newSelection[0] !== curSelection[0]) {
                newSelection.addClass("templatePopupRow_selected");
            }
        }
    }

    find(predicate) {
        return this.#table.find(predicate);
    }
    findRow(predicate) {
        return this.#rowContainer.find(predicate);
    }

    refresh(templates, format) {
        this.#rowContainer.empty();

        for (const templateName of templates) {
            const row = this.#rowTemplate.clone(true);

            row.attr("id", TemplateManager.FormatTemplateId(templateName));
            row.attr("templateName", templateName);
            row.on("click", () => {
                this.selectedRow = row;
            });

            if (format) {
                format(row, templateName);
            }

            this.#rowContainer.append(row);
        }
    }

    remove(selection) {
        if (typeof(selection) === "string") {
            selection = this.#rowContainer.find(selection);
        }
        selection.remove();
    }
}


window.page = new SchedulePage();