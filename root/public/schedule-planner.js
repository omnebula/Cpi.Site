

class SchedulePlanner extends ScheduleController {
    #lessonTemplate;

    constructor(schedulePage) {
        super(schedulePage);

        // Extract the schedule bubble template.
        this.#lessonTemplate = $(".scheduleLesson").detach();

        // Initialize planner-mode column header dropdown menu options.
        this.headers.each((key, value) => {
            const header = $(value);

            const optionHandlers = {
                addLesson: () => { this.#onAddLesson(header); },
                repeatOnce: () => { this.#onRepeatLesson(header); },
                repeatFill: () => { this.#onRepeatFill(header); },
                printAll: () => { this.#onPrintAll(header); },
                copyAll: () => { this.#onCopyAll(header); },
                cutAll: () => { this.#onCutAll(header); },
                bumpAll: () => { this.#onBumpAll(header); },
                clearAll: () => { this.#onClearAll(header); },
                deleteAll: () => { this.#onDeleteAll(header); }
            };

            const menuOptions = header.find(".plannerColumnMenuOptions");
            for (const key in optionHandlers) {
                menuOptions.find(`#${key}`).on("click", (event) => {
                    if (event.currentTarget.enabled) {
                        const handler = optionHandlers[key];
                        handler(header);
                    }
                });
            }
        });
    }

    refresh() {
        this.fetchLessons(this.queryUrl, (data) => {
            this.clearAllContainers();
            this.populateSchedule(data);

            $(".plannerColumnMenuOptions").css("display", "block");
        });
    }
    
    deactivate() {
        super.deactivate();

        // Hide planner-mode column dropdown menus.
        $(".plannerColumnMenuOptions").css("display", "none");
    }

    populateSchedule(data) {
        for (const lesson of data) {
            // Skip if already displayed.
            if (this.scheduleBody.find(`#${lesson.lessonId}`).length) {
                continue;
            }

            const lessonDate = Cpi.ParseLocalDate(lesson.lessonDate);
            const containerId = this.columnIdFromDate(lessonDate);

            const bubble = this.#lessonTemplate.clone(true);

            bubble.attr("id", lesson.lessonId);
            bubble.attr("courseId", lesson.courseId);
            bubble.attr("classId", lesson.classId);
            bubble.attr("lessonSequence", lesson.lessonSequence);
            bubble.attr("href", `/lesson?id=${lesson.lessonId}`);
    
            // Init name.
            bubble.find("#scheduleLessonName").text(lesson.lessonName);

            // Init detail list.
            this.#initLessonDetails(bubble, lesson);
    
            // Init command bar.
            if (!this.viewTracker.isActive) {
                const commandBar = bubble.find(".scheduleLessonCommandBar");
                commandBar.on("mouseup", (event) => {
                    if (event.which === 1) {    // Left-click only
                        event.stopPropagation();
                    }
                });
                commandBar.find("#review").on("click", (event) => {
                    event.stopPropagation();
                    this.#reviewLesson(lesson);
                });
                commandBar.find("#moveUp").on("click", (event) => {
                    event.stopPropagation();
                    this.#moveLesson(bubble, true);
                });
                commandBar.find("#moveDown").on("click", (event) => {
                    event.stopPropagation();
                    this.#moveLesson(bubble, false);
                });
                commandBar.find("#delete").on("click", (event) => {
                    event.stopPropagation();
                    this.#deleteLesson(bubble, containerId);
                });
    
                bubble.on("mouseenter", () => { // Show commmand bar on mouse-enter
                    commandBar.css("display", "flex");
                })
                .on("mouseleave", () => {       // Hide command bar on mouse-leave
                    commandBar.css("display", "none");
                });
            }

            bubble.on("mousedown", (event) => {
                event.stopPropagation();
                this.selectLesson(bubble);
            })
            .on("mouseup", (event) => {
                if (event.which === 1) {  // Left click only
                    event.stopPropagation();
                    window.open(`/lesson?id=${lesson.lessonId}${this.viewTracker.viewParams}`, event.ctrlKey ? "_blank" : "_self");
                }
            });

            // Add to container.
            this.containerFromId(containerId).append(bubble);
        }

        // Update insert-lesson button visibility.
        this.#syncColumnMenuOptions();
    }

    /*
    * Column Header Command Handlers
    */
    #onAddLesson(header) {
        const lessonDate = header.prop("lessonDate");
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

    #onRepeatLesson(header, count) {
        const lessonDate = header.prop("lessonDate");

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
                const targetDate = Cpi.ParseLocalDate(data.toDate);
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

    #onRepeatFill(header) {
        const lessonDate = header.prop("lessonDate");

        var count;

        // If source date is a Friday, schedule all 5 days of the following week.
        const dayOfWeek = lessonDate.getDay();
        if (dayOfWeek === 5) {
            count = 5;
        } 
        else {
            count = 5 - dayOfWeek;
        }

        this.#onRepeatLesson(header, count);
    }

    #onCopyAll(header) {
        this.#transferLessons(header, "copy", "Copy Lesson");
    }

    #onCutAll(header) {
        this.#transferLessons(header, "cut", "Move Lesson");

    }
    #transferLessons(header, action, title) {
        const columnId = header.attr("id");
        const container = this.containerFromId(columnId);

        const lessons = [];
        container.find(".scheduleLesson").each((key, value) => {
            const bubble = $(value);
            const lessonId = bubble.attr("id");
            lessons.push(lessonId);
        });

        if (lessons.length > 0) {
            this.schedulePage.pickDate({
                title: title,
                from: header.prop("lessonDate"),
                accept: (pickResults) => {
                    const params = {
                        lessons: lessons,
                        to: pickResults.to,
                    }
    
                    Cpi.SendApiRequest({
                        method: "POST",
                        url: `/@/lesson/move?action=${action}`,
                        data: JSON.stringify(params),
                        success: () => {
                            this.schedulePage.navigateToDate(pickResults.to);
                        }
                    });
                }
            });    
        }
    }

    #onBumpAll(header) {
        this.bumpLessons(header);
    }

    #onPrintAll(header) {
        const lessonDate = header.prop("lessonDate");
        const lessonDateString = Cpi.FormatIsoDateString(lessonDate);

        Cpi.SendApiRequest({
            method: "GET",
            url: `/@/lessons?start=${lessonDateString}&end=${lessonDateString}&format=full`,
            success: (results) => {
                const lessons = [];

                for (const current of results) {
                    const lesson = {
                        name: current.lessonName,
                        date: current.lessonDate,
                        benchmarks: [],
                        details: {}
                    };
                
                    for (const benchmark of current.benchmarks) {
                        lesson.benchmarks.push({
                            code: benchmark.standardCode,
                            synopsis: benchmark.synopsis
                        });
                    }

                    for (const key in window.cpidata.organization.settings.lessons.details) {
                        const label = window.cpidata.organization.settings.lessons.details[key];
                        lesson.details[label] = current.details[key] || "";
                    }

                    lessons.push(lesson);
                }

                LessonApi.PrintLesson({
                    title: `All courses - ${Cpi.FormatShortDateString(lessonDate)}`,
                    lessons: lessons
                });
            }
        });        
    }

    #onClearAll(header) {
        const lessonDate = header.prop("lessonDate");

        Cpi.ShowAlert({
            caption: "Confirm Clear",
            message: `Are you sure you want to clear all lessons on ${Cpi.FormatShortDateString(lessonDate)}?`,
            accept: () => {
                const containerId = this.columnIdFromDate(lessonDate);
                const container = this.containerFromId(containerId);
        
                const lessonIds = [];
                const bubbles = container.find(".scheduleLesson");
                bubbles.each((key, value) => {
                    lessonIds.push(value.id);
                });
        
                if (lessonIds.length) {
                    Cpi.SendApiRequest({
                        method: "POST",
                        url: `/@/lesson/clear`,
                        data: JSON.stringify(lessonIds),
                        success: (data, status, xhr) => {
                            for (const current of bubbles) {
                                $(current).find("#scheduleLessonDetailList").empty();
                            }
                        }
                    });
                }
            },
            acceptLabel: "Clear",
            closeLabel: "Cancel",
            maxMessageWidth: "fit-content"
        });
    }

    #onDeleteAll(header) {
        const lessonDate = header.prop("lessonDate");

        Cpi.ShowAlert({
            caption: "Confirm Delete",
            message: `Are you sure you want to delete all lessons on ${Cpi.FormatShortDateString(lessonDate)}?`,
            accept: () => {
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
            },
            acceptLabel: "Delete",
            closeLabel: "Cancel",
            maxMessageWidth: "fit-content"
        });
    }

    /*
    * Lesson Bubble Command Handlers
    */

    selectLesson(bubble) {
        if (typeof(bubble) === "string") {
            bubble = $(`#${bubble}`);
        }

        const scheduleContainer = $("#scheduleContainer");
        scheduleContainer.find(".scheduleLesson_selected").removeClass("scheduleLesson_selected");
        if (bubble) {
            bubble.addClass("scheduleLesson_selected");                
        }
    }

    #reviewLesson(lesson) {
        this.schedulePage.selectedLessonId = lesson.lessonId;
        this.schedulePage.setCourseSelection(lesson.courseId, lesson.classId);
    }

    #moveLesson(target, moveUp) {
        const other = moveUp ? target.prev() : target.next();
        if (!other.length) {
            return;
        }

        this.selectLesson(target);

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

    #deleteLesson(bubble, containerId) {
        const lessonId = bubble.attr("id");
        
        LessonApi.DeleteLesson(lessonId, () => {
            bubble.remove();
            this.#syncColumnMenuOptions(containerId);
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