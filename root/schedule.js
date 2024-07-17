

class SchedulePage extends CpiPage {
    #lessonTemplate;

    constructor() {
        super();

        // Compute the start and end dates.
        const searchParams = new URLSearchParams(window.location.search);

        var startDate;
        if (searchParams.has("date")) {
            startDate = this.parseLocalDate(searchParams.get("date"));
        }
        else {
            startDate = this.getTodayDate();
        }

        // If this is Sunday, select the following Monday (skip forward one day).
        const dayOfWeek = startDate.getDay()
        if (dayOfWeek === 0) {
            startDate.setDate(startDate.getDate() + 1);
        }
        // If this is Saturday, select the following Monday (skip forward 2 days).
        else if (dayOfWeek === 6) {
            startDate.setDate(startDate.getDate() + 2);
        }
        // Any day after Monday, select the preceding Monday.
        else if (dayOfWeek > 1) {
            startDate.setDate(startDate.getDate() - (dayOfWeek - 1));
        }

        const endDate = new Date();
        endDate.setDate(startDate.getDate() + 4);

        // Initilaze navigation controls.
        $("#viewPreviousWeek").on("click", () => {
            this.#viewWeek(this.dateAdd(startDate, -7));
        });
        $("#viewCurrentWeek").on("click", () => {
            this.#viewWeek();
        });
        $("#viewNextWeek").on("click", () => {
            this.#viewWeek(this.dateAdd(startDate, 7));
        });

        // Initialize lesson template.
        this.#lessonTemplate = $(".weeklyColumnLesson").detach();
        this.#lessonTemplate.css("visibility", "visible");

        // Initialize column headers.
        var containerDate = startDate;
        const columns = $(".weeklyColumn");
        for (const current of columns) {
            const column = $(current);
            const container = column.find(".weeklyColumnLessonContainer");
            const lessonDate = containerDate;

            column.find(".weeklyColumnDate").text(this.formatShortDateString(lessonDate));

            column.find(".weeklyColumnAddButton").on("click", () => { this.#onAddLesson(container, lessonDate); });

            containerDate = this.dateAdd(containerDate, 1);
        }

        // Retrieve lessons from server.
        this.sendApiRequest({
            method: "GET",
            url: `/@/lessons?start=${this.formatDateString(startDate)}&end=${this.formatDateString(endDate)}}`,
            success: (data, status, xhr) => {
                this.#populateSchedule(startDate, endDate, data);
            }
        });
    }

    #populateSchedule(startDate, endDate, data) {
        const containers = $(".weeklyColumnLessonContainer");

        for (const current of data) {
            const lessonDate = this.parseLocalDate(current.lessonDate);
            const containerId = this.dateDiff(lessonDate, startDate);

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
            lessonDate: this.formatDateString(date)
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

    #viewWeek(startDate) {
        if (!startDate) {
            startDate = this.getTodayDate();
        }

        window.location.href = `/schedule?date=${this.formatDateString(startDate)}`;
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