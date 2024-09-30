

class SchedulePlanner extends ScheduleController {
    #lessonTemplate;
    #templateManager;

    constructor(schedulePage) {
        super(schedulePage);

        // Extract the schedule bubble template.
        this.#lessonTemplate = $(".scheduleLesson").detach();

        // Initialize planner-mode column header dropdown menu options.
        this.headers.each((key, value) => {
            const header = $(value);
            const lessonDate = header.prop("lessonDate");
            const menuOptions = header.find(".plannerColumnMenuOptions");

            const addLesson = menuOptions.find("#addLesson");
            addLesson.on("click", () => {
                if (addLesson.prop("enabled")) {
                    this.#onAddLesson(lessonDate);
                }
            });
    
            const repeatOnce = menuOptions.find("#repeatOnce");
            repeatOnce.on("click", () => {
                if (repeatOnce.prop("enabled")) {
                    this.#onRepeatLesson(lessonDate);
                }
            });
    
            const repeatFill = menuOptions.find("#repeatFill");
            repeatFill.on("click", () => {
                if (repeatFill.prop("enabled")) {
                    this.#onRepeatFill(lessonDate);
                }
            });
    
            const deleteAll = menuOptions.find("#deleteAll");
            deleteAll.on("click", () => {
                if (deleteAll.prop("enabled")) {
                    this.#onDeleteAll(lessonDate);
                }
            });
    
        });

        // Initialize template manager.
        this.#templateManager = new TemplateManager(this);

        // Initialize click handler to unselect a lessson when user clicks empty space.
        $(".appFrame").on("mousedown", () => {
            this.#selectLesson(undefined);
        });
    }

    activate() {
        this.fetchLessons(this.queryUrl, (data) => {
            this.populateSchedule(data);

            $(".plannerColumnMenuOptions").css("display", "block");

            this.#templateManager.show();

            // Conditionally set the current selection.
            if (document.referrer && (document.referrer !== "")) {
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
    
    deactivate() {
        super.deactivate();

        // Hide planner-mode column dropdown menus.
        $(".plannerColumnMenuOptions").css("display", "none");

        // Hide the templates menu.
        this.#templateManager.hide();
    }

    populateSchedule(data, clear) {
        if (clear) {
            for (const current of this.containers) {
                const container = $(current);
                if (!container.prop("holiday")) {
                    container.empty();
                }
            }
        }

        for (const current of data) {
            // Skip if already displayed.
            if (this.scheduleBody.find(`#${current.lessonId}`).length) {
                continue;
            }

            const lessonDate = Cpi.ParseLocalDate(current.lessonDate);
            const containerId = this.columnIdFromDate(lessonDate);

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
            if (!this.viewTracker.isActive) {
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
                    window.open(`/lesson?id=${current.lessonId}${this.viewTracker.viewParams}`, event.ctrlKey ? "_blank" : "_self");
                }
            });

            // Add to container.
            this.containerFromId(containerId).append(lesson);
        }

        // Update insert-lesson button visibility.
        this.#syncColumnMenuOptions();
    }

    /*
    * Column Header Command Handlers
    */
    #onAddLesson(lessonDate) {
        const containerId = this.columnIdFromDate(lessonDate);
        const lessons = $(`.scheduleContainer #${containerId} .scheduleLesson`);

        const exclusions = [];
        for (const current of lessons) {
            exclusions.push($(current).attr("courseId") + $(current).attr("classId"));
        }

        this.coursePicker.show({
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
                        }
                    });
                }
            }
        });
    }

    #onRepeatLesson(lessonDate, count) {
        count = count || 1;

        const params = {
            lessonDate: Cpi.FormatIsoDateString(lessonDate),
            count: count
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
                    this.schedulePage.navigateToWeek(targetWeek);
                }
                else {
                    // Clear out the target columns.
                    var containerId = this.columnIdFromDate(targetDate);
                    while (count--) {
                        this.schedulePage.clearContainer(containerId++);
                    }

                    // Repopulate the column(s).
                    this.populateSchedule(data.lessons);
                }
            }
        });
    }

    #onRepeatFill(lessonDate) {
        var count;

        // If source date is a Friday, schedule all 5 days of the following week.
        const dayOfWeek = lessonDate.getDay();
        if (dayOfWeek === 5) {
            count = 5;
        } 
        else {
            count = 5 - dayOfWeek;
        }

        this.#onRepeatLesson(lessonDate, count);
    }

    #onDeleteAll(lessonDate) {
        const containerId = this.columnIdFromDate(lessonDate);
        const container = this.containerFromId(containerId);

        const lessonIds = [];
        const bubbles = container.find(".scheduleLesson");
        bubbles.each((key, value) => {
            lessonIds.push(value.id);
        });

        if (lessonIds.length) {
            Cpi.SendApiRequest({
                method: "DELETE",
                url: `/@/lesson`,
                data: JSON.stringify(lessonIds),
                success: (data, status, xhr) => {
                    container.empty();
                    this.#syncColumnMenuOptions(containerId);
                }
            });
        }
    }

    /*
    * Lesson Bubble Command Handlers
    */

    #selectLesson(lesson) {
        const scheduleContainer = $("#scheduleContainer");
        scheduleContainer.find(".scheduleLesson_selected").removeClass("scheduleLesson_selected");
        if (lesson) {
            lesson.addClass("scheduleLesson_selected");                
        }
    }

    #deleteLesson(lesson, containerId) {
        const lessonId = lesson.attr("id");

        Cpi.SendApiRequest({
            method: "DELETE",
            url: `/@/lesson/${lessonId}`,
            success: (data, status, xhr) => {
                lesson.remove();
                this.#syncColumnMenuOptions(containerId);
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

    #syncColumnMenuOptions(containerId) {
        const maxCourses = this.schedulePage.accountData.options.courses.length;
        const headers = this.headers;
        const containers = this.containers;

        var index, max;
        if (containerId) {
            index = containerId;
            max = index + 1;
        }
        else {
            index = 0;
            max = headers.length;
        }

        for (;index < max; ++index) {
            // GGet current header.
            const header = $(headers[index]);

            // Skip if this is a holiday,
            if (!header.prop("holiday")) {
                const current = $(containers[index]);

                const menuOptions = header.find(".plannerColumnMenuOptions");

                // Enable Add Lessons if we haven't assigned all the courses yet.
                if (current.children().length < maxCourses) {
                    menuOptions.find("#addLesson").removeClass("scheduleColumnMenuOption_disabled").prop("enabled", true);
                }
                // Else, disable Add Lessons.
                else {
                    menuOptions.find("#addLesson").addClass("scheduleColumnMenuOption_disabled").prop("enabled", false);
                }

                // Enable Repeat if there's at least one assigned option.
                if (current.children().length) {
                    menuOptions.find(".activeOption").removeClass("scheduleColumnMenuOption_disabled").prop("enabled", true);
                }
                // Else, disable Repeat options.
                else {
                    menuOptions.find(".activeOption").addClass("scheduleColumnMenuOption_disabled").prop("enabled", false);
                }
            }
        }
    }

    #initLessonDetails(lessonBubble, lessonData) {
        if (!lessonData.details || !lessonData.details.length) {
            return;
        }

        var hintPopup, waitTimeout, detailHints, currentLabel;

        function setHintText() {
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
                currentLabel.addClass("scheduleLessonDetail_hover");

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