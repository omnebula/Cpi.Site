

class SchedulePage extends CpiPage {
    #weekDates;
    #lessonTemplate;

    constructor() {
        super();

        if (!Cpi.ValidateLogin()) {
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

        // Initialize lesson template.
        this.#lessonTemplate = $(".weeklyColumnLesson").detach();
        this.#lessonTemplate.css("visibility", "visible");

        // Initialize column headers.
        const today = Cpi.GetTodayDate();
        var containerDate = this.#weekDates.start;
        const columns = $(".weeklyColumn");
        for (const current of columns) {
            const column = $(current);
            const container = column.find(".weeklyColumnLessonContainer");
            const lessonDate = containerDate;

            column.find(".weeklyColumnDate").text(Cpi.FormatShortDateString(lessonDate));

            if (Cpi.IsHoliday(lessonDate)) {
                column.find(".weeklyColumnDay").addClass("weeklyColumnHoliday");
                column.find(".weeklyColumnDate").addClass("weeklyColumnHoliday");
                column.find("#addLesson").css("visibility", "hidden");
                column.find("#repeatColumn").css("visibility", "hidden");
            }
            else {
                column.find("#addLesson").on("click", () => { this.#onAddLesson(container, lessonDate); });
                column.find("#repeatColumn").on("click", () => { this.#onRepeatColumn(lessonDate); });
            }

            if (lessonDate.getTime() === today.getTime()) {
                column.find(".weeklyColumnHeader").addClass("weeklyColumnHeader_today");
            }
            
            containerDate = Cpi.DateAdd(containerDate, 1);
        }

        Cpi.SendApiRequest({
            method: "GET",
            url: `/@/lessons?start=${Cpi.FormatIsoDateString(this.#weekDates.start)}&end=${Cpi.FormatIsoDateString(this.#weekDates.end)}`,
            success: (data, status, xhr) => {
                this.#populateSchedule(data);
            }
        });
    }

    #populateSchedule(data) {
        const containers = $(".weeklyColumnLessonContainer");

        for (const current of data) {
            const lessonDate = Cpi.ParseLocalDate(current.lessonDate);
            const containerId = Cpi.DateDiff(lessonDate, this.#weekDates.start);

            const lesson = this.#lessonTemplate.clone(true);

            const input = lesson.find(".weeklyColumnLessonInput");
            input.val(current.lessonName);
            input.attr("readonly", true);

            this.#initLesson(lesson, current);

            // Add to container.
            $(containers[containerId]).append(lesson);
        }
    }

    #onAddLesson(container, containerDate) {
        const lesson = this.#lessonTemplate.clone(true);

        container.append(lesson);

        const input = lesson.find(".weeklyColumnLessonInput");
        input.on("keyup", (event) => {
                if (!input.attr("readonly")) {
                    if (event.keyCode === 13) {
                        input.blur();
                    }
                    else if (event.keyCode === 27) {
                        lesson.remove();
                    }
                }
            })
            .on("blur", (event) => {
                this.#saveLesson(lesson, input, containerDate);
            })
            .focus();
    }

    #saveLesson(lesson, input, date) {
        const lessonName = input.val().trim();
        if (!lessonName.length) {
            lesson.remove();
            return;
        }

        input.attr("readonly", true);
        input.off("blur").off("keyup");

        if (!this.accountData.classes || this.accountData.classes.length === 0) {
            Cpi.ShowAlert("No class assigned");
            return;
        }

        const params = {
            lessonName: lessonName,
            lessonDate: Cpi.FormatIsoDateString(date),
            classId: this.accountData.classes[0].classId
        };

        Cpi.SendApiRequest({
            method: "PUT",
            url: `/@/lesson`,
            data: JSON.stringify(params),
            success: (data, status, xhr) => {
                this.#initLesson(lesson, data);
            }
        });
    }

    #initLesson(lesson, data) {
        lesson.attr("id", data.lessonId);
        lesson.attr("lessonSequence", data.lessonSequence);
        lesson.attr("href", `/lesson?id=${data.lessonId}`);

        // Init command bar.
        const commandBar = lesson.find(".weeklyColumnLessonCommandBar");
        commandBar.find("#delete").on("click", (event) => {
            event.stopPropagation();
            this.#deleteLesson(lesson);
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
        .on("click", (event) => {
            window.open(`/lesson?id=${data.lessonId}`, event.ctrlKey ? "_blank" : "_self");
        });
    }

    #viewWeek(weekNumber) {
        if (!weekNumber) {
            weekNumber = Cpi.GetCurrentWeekNumber();
        }

        window.location.href = `/schedule?week=${weekNumber}`;
    }

    #deleteLesson(lesson) {
        const lessonId = lesson.attr("id");

        Cpi.SendApiRequest({
            method: "DELETE",
            url: `/@/lesson/${lessonId}`,
            success: (data, status, xhr) => {
                lesson.remove();
            }
        })
    }
    #moveLesson(target, moveUp) {
        const other = moveUp ? target.prev() : target.next();
        if (!other.length) {
            return;
        }

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
                const targetWeek = Cpi.CalculateWeekNumber(data.targetDate);
                if (targetWeek !== Cpi.GetCurrentWeekNumber()) {
                    this.#viewWeek(targetWeek);
                }
                else {
                    // Clear out the target (next) column.
                    const containerId = Cpi.DateDiff(lessonDate, this.#weekDates.start) + 1;
                    const container = $(".weeklyColumnLessonContainer")[containerId];
                    $(container).children().remove();

                    // Repopulate the column.
                    this.#populateSchedule(data.lessons);
                }
            }
        })
    }
}

window.page = new SchedulePage();