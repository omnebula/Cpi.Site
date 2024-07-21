

class SchedulePage extends CpiPage {
    #lessonTemplate;

    constructor() {
        super();

        // Compute the start and end dates.
        const searchParams = new URLSearchParams(window.location.search);
        const weekNumber = parseInt(searchParams.get("week")) || Cpi.GetCurrentWeekNumber();
        const weekDates = Cpi.CalculateWeekDates(weekNumber);
        if (!weekDates) {
            // TODO: show invalid data error.
            return;
        }

        // Initilaze navigation controls.
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
        var containerDate = weekDates.start;
        const columns = $(".weeklyColumn");
        for (const current of columns) {
            const column = $(current);
            const container = column.find(".weeklyColumnLessonContainer");
            const lessonDate = containerDate;

            column.find(".weeklyColumnDate").text(Cpi.FormatShortDateString(lessonDate));

            column.find(".weeklyColumnAddButton").on("click", () => { this.#onAddLesson(container, lessonDate); });

            containerDate = Cpi.DateAdd(containerDate, 1);
        }

        // Retrieve lessons from server.
        this.sendApiRequest({
            method: "GET",
            url: `/@/lessons?start=${Cpi.FormatDateString(weekDates.start)}&end=${Cpi.FormatDateString(weekDates.end)}}`,
            success: (data, status, xhr) => {
                this.#populateSchedule(weekDates.start, weekDates.end, data);
            }
        });
    }

    #populateSchedule(startDate, endDate, data) {
        const containers = $(".weeklyColumnLessonContainer");

        for (const current of data) {
            const lessonDate = Cpi.ParseLocalDate(current.lessonDate);
            const containerId = Cpi.DateDiff(lessonDate, startDate);

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

        const params = {
            lessonName: lessonName,
            lessonDate: Cpi.FormatDateString(date)
        };

        this.sendApiRequest({
            method: "POST",
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

        this.sendApiRequest({
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

        this.sendApiRequest({
            method: "PUT",
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
}

window.page = new SchedulePage();