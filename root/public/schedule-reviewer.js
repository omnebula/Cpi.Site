

class ScheduleReviewer extends ScheduleController {
    #courseId;
    #classId;
    #editorTemplate;
    #benchmarkItemTemplate;
    #benchmarkPicker;
    #shadowParent;

    constructor(schedulePage) {
        super(schedulePage);

        this.#editorTemplate = $(".scheduleEditor").detach();
        this.#benchmarkItemTemplate = this.#editorTemplate.find(".scheduleEditorBenchmark").detach();
        this.#shadowParent = $("#shadowParent");

        this.headers.each((key, value) => {
            const header = $(value);
            const lessonDate = header.prop("lessonDate");
            const menuOptions = header.find(".reviewerColumnMenuOptions");

            const addLesson = menuOptions.find("#addLesson");
            addLesson.on("click", () => {
                if (addLesson.prop("enabled")) {
                    this.#addLesson(lessonDate);
                }
            });
            const viewLesson = menuOptions.find("#viewLesson");
            viewLesson.on("click", (event) => {
                if (viewLesson.prop("enabled")) {
                    this.#viewLesson(lessonDate, event.ctrlKey ? "_blank" : "_self");
                }
            });
            const viewRoadmap = menuOptions.find("#viewRoadmap");
            viewRoadmap.on("click", () => {
                if (viewRoadmap.prop("enabled")) {
                    this.#viewRoadmap(lessonDate, event.ctrlKey ? "_blank" : "_self");
                }
            });
            const printLesson = menuOptions.find("#printLesson");
            printLesson.on("click", () => {
                if (printLesson.prop("enabled")) {
                    this.#printLesson(lessonDate);
                }
            });
            const deleteLesson = menuOptions.find("#deleteLesson");
            deleteLesson.on("click", () => {
                if (deleteLesson.prop("enabled")) {
                    this.#deleteLesson(lessonDate);
                }
            });
        });
    }

    activate() {
        const selection = this.schedulePage.selectedCourseValue;
        if (!selection) {
            return;
        }

        $(".reviewerColumnMenuOptions").css("display", "block");
        
        const parts = selection.split("_");
        this.#courseId = parts[0];
        this.#classId = parts[1];

        const quryUrl = this.queryUrl + `&courseId=${this.#courseId}&classId=${this.#classId}`;

        this.fetchLessons(quryUrl, (data) => {
            // Assume empty columns, i.e., enable add and disable all other menu options.
            // populateSchedule will adjust as needed.
            this.headers.find(".reviewerColumnMenuOptions #addLesson").removeClass("scheduleColumnMenuOption_disabled").prop("enabled", true);
            this.headers.find(".reviewerColumnMenuOptions .activeOption").addClass("scheduleColumnMenuOption_disabled").prop("enabled", false);
            
            this.populateSchedule(data);
        });
    }

    deactivate() {
        super.deactivate();

        // Hide reviewer mode column dropdown menus.
        $(".reviewerColumnMenuOptions").css("display", "none");

        this.#shadowParent.empty();
    }

    populateSchedule(data) {
        for (const lesson of data) {
            const editor = this.#editorTemplate.clone(true);

            editor.attr("id", lesson.lessonId);
            editor.prop("lesson", lesson);

            // Benchmarks
            const benchmarkContainer = editor.find(".benchmarkContainer");
            benchmarkContainer.on("click", () => {
                this.#showBenchmarkPicker(editor, lesson);
            });
            benchmarkContainer.parent().find("label").on("click", () => {
                this.#showBenchmarkPicker(editor, lesson);
            });

            this.#initBenchmarks(editor, lesson.lessonId, lesson.benchmarks);

            // Initialize details.
            for (const key in lesson.details) {
                const value = lesson.details[key];
                const textarea = editor.find(`#${key}`);
                textarea.val(value);
            }
                
            // Menu
            const columnId = this.columnIdFromDate(Cpi.ParseLocalDate(lesson.lessonDate));
            this.#enableActiveOptions(columnId, true);

            // Insert editor into container.
            const container = this.containerFromId(columnId);
            container.append(editor);

            // Apply autogrow to text areas after adding to document so that it has actual dimensions.
            const textareas = editor.find(".scheduleEditorTextarea");
            textareas.autogrow({ shadowParent: this.#shadowParent });

            // Hook into blur event to detect changes
            var changed = false;
            textareas.each((key, value) => {
                const textarea = $(value);

                textarea
                    .on("blur", () => {
                        if (changed) {
                            const params = { details: {} };
                            textareas.each((key, value) => {
                                const textarea = $(value);
                                const id = textarea.attr("id");
                                const val = textarea.val();
                                params.details[id] = val;
                            });

                            Cpi.SendApiRequest({
                                method: "PATCH", 
                                url: `/@/lesson/${lesson.lessonId}?noecho`,
                                data: JSON.stringify(params),
                                hideSpinner: true,
                                success: () => {
                                    changed = false;
                                }
                            })
                        }
                    })
                    .on("change", () => {
                        changed = true;
                    });

                // Implement label focus, i.e. clicking label focuses textarea.
                // Note that the normal "for" attribute doesn't work because of
                // duplicate textarea ids
                const row = textarea.parent();
                const label = row.find("label");
                label.on("click", () => {
                    textarea.focus();
                });
            });
        }
    }

    #showBenchmarkPicker(editor, lesson) {
        if (!this.#benchmarkPicker) {
            this.#benchmarkPicker = new BenchmarkPicker();
        }

        this.#benchmarkPicker.show({
            initialSubject: lesson.subjectName,
            initialGrade: lesson.gradeName,
            success: (benchmarks) => {
                this.#sendNewBenchmarks(editor, lesson.lessonId, benchmarks);
            }
        });
    }
    #sendNewBenchmarks(editor, lessonId, benchmarks) {
        const params = {
            lessonId: lessonId,
            benchmarks: []
        };

        for (const current of benchmarks) {
            params.benchmarks.push(current.benchmarkId);
        }

        Cpi.SendApiRequest({
            method: "PUT",
            url: "/@/lesson/benchmark",
            data: JSON.stringify(params),
            success: (data) => {
                this.#initBenchmarks(editor, lessonId, benchmarks);
            }
        });
    }

    #initBenchmarks(editor, lessonId, benchmarks) {
        if (benchmarks && benchmarks.length) {
            const benchmarkContainer = editor.find(".benchmarkContainer");
            for (const benchmark of benchmarks) {
                const benchmarkItem = this.#benchmarkItemTemplate.clone(true);

                benchmarkItem.find("a")
                    .attr("id", benchmark.benchmarkId)
                    .attr("href", benchmark.referenceUrl)
                    .attr("title", benchmark.synopsis)
                    .text(benchmark.standardCode);

                benchmarkItem.find("#removeBenchmark")
                    .on("click", (event) => {
                        const params = {
                            lessonId: lessonId,
                            benchmarkId: benchmark.benchmarkId
                        };
                
                        Cpi.SendApiRequest({
                            method: "DELETE",
                            url: "/@/lesson/benchmark",
                            data: JSON.stringify(params),
                            success: (data, status, xhr) => {
                                benchmarkItem.remove();
                            }
                        });

                        event.stopPropagation();
                    });

                benchmarkContainer.append(benchmarkItem);
            }
        }
    }

    #addLesson(lessonDate) {
        const params = {
            lessonDate: lessonDate,
            lessons: [
                {
                    courseId: this.#courseId,
                    classId: this.#classId
                }
            ]
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

    #viewLesson(lessonDate, target) {
        const container = this.containerFromDate(lessonDate);
        const editor = container.find(".scheduleEditor");
        const lessonId = editor.attr("id");
        window.open(`/lesson?id=${lessonId}${this.viewTracker.viewParams}`, target);
    }

    #viewRoadmap(lessonDate, target) {
        const container = this.containerFromDate(lessonDate);
        const editor = container.find(".scheduleEditor");
        const lesson = editor.prop("lesson");
        window.open(`/roadmap?subject=${lesson.subjectName}&grade=${lesson.gradeName}${this.viewTracker.viewParams}`, target);
    }

    #printLesson(lessonDate) {
        const container = this.containerFromDate(lessonDate);
        const editor = container.find(".scheduleEditor");
        const lesson = editor.prop("lesson");
        const benchmarkContainer = editor.find(".benchmarkContainer");

        const params = {
            name: lesson.lessonName,
            date: lesson.lessonDate,
            benchmarks: [],
            details: {}
        };

        benchmarkContainer.find(".scheduleEditorBenchmark").each((key, value) => {
            const element = $(value);
            const benchmarkCode = element.find("a");
            params.benchmarks.push({
                code: benchmarkCode.text(),
                synopsis: benchmarkCode.attr("title")
            });
        });

        editor.find("#scheduleEditorDetails .scheduleEditorRow").each((key, value) => {
            const element = $(value);
            const detailLabel = element.find("label").text();
            const detailContent = element.find("textarea").val();
            params.details[detailLabel] = detailContent;
        });

        LessonApi.PrintLesson(params);
    }

    #deleteLesson(lessonDate) {
        const columnId = this.columnIdFromDate(lessonDate);
        const container = this.containerFromId(columnId);
        const editor = container.find(".scheduleEditor");
        const lessonId = editor.attr("id");

        Cpi.SendApiRequest({
            method: "DELETE",
            url: `/@/lesson/${lessonId}`,
            success: () => {
                editor.remove();
                this.#enableActiveOptions(columnId, false);
            }
        })
    }

    #enableActiveOptions(columnId, enable) {
        const header = this.headerFromId(columnId);
        const options = header.find(".reviewerColumnMenuOptions");

        if (enable) {
            options.find("#addLesson").addClass("scheduleColumnMenuOption_disabled").prop("enabled", false);
            header.find(".activeOption").removeClass("scheduleColumnMenuOption_disabled").prop("enabled", true);
        }
        else {
            options.find("#addLesson").removeClass("scheduleColumnMenuOption_disabled").prop("enabled", true);
            header.find(".activeOption").addClass("scheduleColumnMenuOption_disabled").prop("enabled", false);
        }

    }
}