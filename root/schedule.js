

class SchedulePage extends CpiPage {
    #lessonTemplate = $(".scheduleLesson").detach();
    #coursePicker;
    #weekDates;

    constructor() {
        super();

        if (!this.validateLogin()) {
            return;
        }

        // Compute the start and end dates.
        const searchParams = new URLSearchParams(window.location.search);
        const weekNumber = parseInt(searchParams.get("week")) || Cpi.GetCurrentWeekNumber();

        this.#weekDates = Cpi.CalculateWeekDates(weekNumber);

        // Initialize navigation controls.
        const selector = $("#selectWeek");
        for (var week = 1; week <= Cpi.GetLastWeekNumber(); ++week) {
            const option = $(document.createElement("option"));
            option.val(week);
            option.text(`Week ${week} - ${Cpi.FormatShortDateString(Cpi.CalculateWeekStartDate(week))}`);
            selector.append(option);
        }
        selector.val(weekNumber);
        selector.on("change", () => {
            const newWeekNumber = selector.val();
            if (weekNumber !== newWeekNumber) {
                this.#viewWeek(newWeekNumber);
            }
        });

        if (weekNumber > 1) {
            $("#viewPreviousWeek").on("click", () => { this.#viewWeek(weekNumber - 1); });
        }
        else {
            $("#viewPreviousWeek").prop("disabled", true);
        }

        if (weekNumber !== Cpi.GetCurrentWeekNumber()) {
            $("#viewCurrentWeek").on("click", () => { this.#viewWeek(); });
        }
        else {
            $("#viewCurrentWeek").prop("disabled", true);
        }

        if (weekNumber < Cpi.GetLastWeekNumber()) {
            $("#viewNextWeek").on("click", () => { this.#viewWeek(weekNumber + 1); });
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
            // Else, do regular school day/
            else {
                column.find("#addLesson").on("click", () => { this.#onAddLesson(lessonDate); });
                column.find("#repeatColumn").on("click", () => { this.#onRepeatColumn(lessonDate); });
            }

            if (lessonDate.getTime() === today.getTime()) {
                column.find(".scheduleColumnHeader").addClass("scheduleColumnHeader_today");
            }
            
            containerDate = Cpi.DateAdd(containerDate, 1);
        }

        Cpi.ShowAppFrame();
        
        this.#coursePicker = new CoursePicker(this.accountData.courses);

        $(".appFrame").on("mousedown", () => {
            this.#selectLesson(undefined);
        });

        // Query lessons.
        Cpi.SendApiRequest({
            method: "GET",
            url: `/@/lessons?start=${Cpi.FormatIsoDateString(this.#weekDates.start)}&end=${Cpi.FormatIsoDateString(this.#weekDates.end)}`,
            success: (data, status, xhr) => {
                this.#populateSchedule(data);

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

    #onAddLesson(lessonDate) {
        const containerId = this.#calcContainerId(lessonDate);
        const lessons = $(`.scheduleContainer #${containerId} .scheduleLesson`);

        const exclusions = [];
        for (const current of lessons) {
            exclusions.push($(current).attr("courseId") + $(current).attr("classId"));
        }

        this.#coursePicker.show(exclusions, (selection) => {
            lessonDate = Cpi.FormatIsoDateString(lessonDate);

            const params = {
                lessonDate: lessonDate,
                lessons: []
            }

            for (const current of selection) {
                params.lessons.push({
                    courseId: current.courseId,
                    classId: current.classId
                });
            }

            if (params.lessons.length) {
                Cpi.SendApiRequest({
                    method: "PUT",
                    url: `/@/lesson/batch`,
                    data: JSON.stringify(params),
                    success: (results, status, xhr) => {
                        this.#populateSchedule(results);

                        // Update insert-lesson button visibility.
                        this.#syncInsertButtons(containerId);
                    }
                });
       
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
                    this.#populateSchedule(data.lessons);

                    // Update insert-lesson button visibility.
                    this.#syncInsertButtons(containerId);
                }
            }
        })
    }

    #calcContainerId(lessonDate) {
        return Cpi.DateDiff(lessonDate, this.#weekDates.start);
    }

    #populateSchedule(data) {
        const containers = $(".scheduleLessonContainer");

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
    
            // Init command bar.
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
            })
            .on("mousedown", (event) => {
                event.stopPropagation();
                this.#selectLesson(lesson);
            })
            .on("mouseup", (event) => {
                if (event.which === 1) {  // Left click only
                    event.stopPropagation();
                    window.open(`/lesson?id=${current.lessonId}`, event.ctrlKey ? "_blank" : "_self");
                }
            });
    
            // Add to container.
            $(containers[containerId]).append(lesson);
        }
    }

    #viewWeek(weekNumber) {
        if (!weekNumber) {
            weekNumber = Cpi.GetCurrentWeekNumber();
        }

        window.location.href = `/schedule?week=${weekNumber}`;
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
        const maxCourses = this.accountData.courses.length;
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
}


class CoursePicker {
    #popup = $("#coursePicker");
    #courseContainer = $("#courseTableBody");

    constructor(courses) {
        // Mass selection button.
        this.#popup.find("#selectAll").on("click", () => {
            this.#courseContainer.find("input[type=checkbox]").prop("checked", true);
        });
        this.#popup.find("#deselectAll").on("click", () => {
            this.#courseContainer.find("input[type=checkbox]").prop("checked", false);
        });

        // Init table contents
        const courseRowTemplate = this.#courseContainer.find("#courseRow").detach();
        
        for (const current of courses) {
            const row = courseRowTemplate.clone(true);

            row.attr("id", current.courseId + current.classId);
            row.attr("courseId", current.courseId);
            row.attr("classId", current.classId);
            row.find("#courseName").text(current.courseName);
            row.find("#className").text(current.className);

            this.#courseContainer.append(row);
        }
    }

    show(exclusions, accept) {
        this.#courseContainer.children().css("display", "table-row");
        this.#courseContainer.find("input:checked").prop("checked", false);

        if (exclusions) {
            for (const current of exclusions) {
                this.#courseContainer.find(`#${current}`).css("display", "none");
            }
        }

        Cpi.ShowPopup("#coursePicker", () => {
            this.#acceptSelection(accept);
        });
    }

    #acceptSelection(accept) {
        const selection = [];
        const checkboxes = this.#courseContainer.find("input:checked");

        for (const current of checkboxes) {
            const row = $(current).parent().parent();
            if (row.css("display") !== "none") {
                selection.push({
                    courseId: row.attr("courseId"),
                    classId: row.attr("classId")
                });
            }
        }

        accept(selection);
    }
}


window.page = new SchedulePage();