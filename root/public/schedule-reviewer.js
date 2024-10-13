

class ScheduleReviewer extends ScheduleController {
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

            const optionHandlers = {
                addLesson: () => { this.#addLesson(header); },
                viewLesson: () => { this.#viewLesson(header, event.ctrlKey ? "_blank" : "_self"); },
                viewCourses: () => { this.#viewCourses(header); },
                viewRoadmap: () => { this.#viewRoadmap(header, event.ctrlKey ? "_blank" : "_self"); },
                printLesson: () => { this.#printLesson(header); },
                copyLesson: () => { this.#copyLesson(header); },
                cutLesson: () => { this.#cutLesson(header); },
                bumpLesson: () => { this.#bumpLesson(header); },
                clearLesson: () => { this.#clearLesson(header); },
                deleteLesson: () => { this.#deleteLesson(header); }
            };

            const menuOptions = header.find(".reviewerColumnMenuOptions");
            for (const key in optionHandlers) {
                menuOptions.find(`#${key}`).on("click", (event) => {
                    if (event.currentTarget.enabled) {
                        const handler = optionHandlers[key];
                        handler(header);
                    }
                });
            }

            const bumpLesson = menuOptions.find("#bumpLesson");
            bumpLesson.on("click", () => {
                if (bumpLesson.prop("enabled")) {
                    
                }
            });
            const deleteLesson = menuOptions.find("#deleteLesson");
            deleteLesson.on("click", () => {
                if (deleteLesson.prop("enabled")) {
                    
                }
            });
        });
    }

    refresh() {
        if (this.schedulePage.courseSelection) {
           
            const courseSelection = this.schedulePage.courseSelection;
            const quryUrl = this.queryUrl + `&courseId=${courseSelection.courseId}&classId=${courseSelection.classId}&format=full`;

            this.fetchLessons(quryUrl, (data) => {
                $(".reviewerColumnMenuOptions").css("display", "block");
            
                // Assume empty columns, i.e., enable add and disable all other menu options; populateSchedule will adjust as needed.
                this.headers.find(".reviewerColumnMenuOptions #addLesson").removeClass("scheduleColumnMenuOption_disabled").prop("enabled", true);
                this.headers.find(".reviewerColumnMenuOptions .activeOption").addClass("scheduleColumnMenuOption_disabled").prop("enabled", false);
                
                this.clearAllContainers();
                this.#shadowParent.empty();
                this.populateSchedule(data);
            });
        }
    }

    deactivate() {
        super.deactivate();

        // Hide reviewer mode column dropdown menus.
        $(".reviewerColumnMenuOptions").css("display", "none");

        this.#shadowParent.empty();
    }

    populateSchedule(data) {
        for (const lesson of data) {
            if ((lesson.courseId === this.schedulePage.courseSelection.courseId) && ((lesson.classId === this.schedulePage.courseSelection.classId))) {

                const columnId = this.columnIdFromDate(Cpi.ParseLocalDate(lesson.lessonDate));

                const editor = this.#editorTemplate.clone(true);
                editor.attr("id", lesson.lessonId);
                editor.prop("lesson", lesson);
    
                // Benchmarks
                this.#initBenchmarks(editor, lesson.lessonId, lesson.benchmarks);
    
                // Initialize details.
                for (const key in lesson.details) {
                    const value = lesson.details[key];
                    const textarea = editor.find(`#${key}`);
                    textarea.val(value);
                }
                    
                // Insert editor into container.
                const container = this.containerFromId(columnId);
                container.append(editor);
    
                // Apply autogrow to text areas after adding to document so that it has actual dimensions.
                const textareas = editor.find(".scheduleEditorTextarea");
                textareas.autogrow({ shadowParent: this.#shadowParent }).trigger("change");
    
                // Disable modifying commands if we're in view-only mode.
                if (this.viewTracker.isActive) {
                    textareas.prop("readonly", true);
                }
                else {
                    // Initialize benchmark picker invocation.
                    const benchmarkContainer = editor.find(".benchmarkContainer");
                    benchmarkContainer.on("click", () => {
                        this.#showBenchmarkPicker(editor, lesson);
                    });
                    benchmarkContainer.parent().find("label").on("click", () => {
                        this.#showBenchmarkPicker(editor, lesson);
                    });
    
                    // Initialize detail modification actions (blur).
                    // Hook into blur event to detect changes
                    var changed = false;
                    textareas.each((key, value) => {
                        const textarea = $(value);
    
                        textarea
                            .prop("readonly", false)
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
                            })
                            .on("paste", () => {
                                setTimeout( () => { textarea.trigger("change"); }, 10);
                            })
                            .on("cut", () => {
                                textarea.trigger("change");
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
        }

        this.#syncMenuOptions();
    }

    #syncMenuOptions() {
        for (var columnId = 0; columnId < 5; ++columnId) {
            const container = this.containerFromId(columnId);
            const editor = container.find(".scheduleEditor");
            const enable = editor.length > 0;

            this.#enableActiveOptions(columnId, enable);
        }
    }

    #showBenchmarkPicker(editor, lesson) {
        if (!this.#benchmarkPicker) {
            this.#benchmarkPicker = new BenchmarkPicker();
        }

        const assignments = [];
        const benchmarkItems = editor.find(".scheduleEditorBenchmarkCode");
        for (const current of benchmarkItems) {
            const benchmark = $(current);
            assignments[benchmark.attr("id")] = benchmark.text();
        }

        this.#benchmarkPicker.show({
            initialSubject: lesson.subjectName,
            initialGrade: lesson.gradeName,
            assignments: assignments,
            success: (benchmarks) => {
                this.#sendNewBenchmarks(editor, lesson.lessonId, benchmarks);
            }
        });
    }
    #sendNewBenchmarks(editor, lessonId, benchmarks) {
        const params = {
            lessonId: lessonId,
            benchmarks: benchmarks
        };

        Cpi.SendApiRequest({
            method: "PUT",
            url: "/@/lesson/benchmark",
            data: JSON.stringify(params),
            success: (results) => {
                this.#initBenchmarks(editor, lessonId, results);
            }
        });
    }

    #initBenchmarks(editor, lessonId, benchmarks) {
        if (benchmarks && benchmarks.length) {
            const benchmarkContainer = editor.find(".benchmarkContainer");
            benchmarkContainer.empty();
                        
            for (const benchmark of benchmarks) {
                const benchmarkItem = this.#benchmarkItemTemplate.clone(true);

                benchmarkItem.find("a")
                    .attr("id", benchmark.benchmarkId)
                    .attr("href", benchmark.referenceUrl)
                    .attr("title", benchmark.synopsis)
                    .text(benchmark.standardCode)
                    .on("click", (event) => {
                        event.stopPropagation();
                    });

                benchmarkContainer.append(benchmarkItem);

                if (this.viewTracker.isActive) {
                    benchmarkItem.addClass("scheduleEditorBenchmark_inactive");
                }
                else {
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
                }
            }
        }
    }

    #addLesson(header) {
        const lessonDate = header.prop("lessonDate");

        const params = {
            lessonDate: lessonDate,
            lessons: [ this.schedulePage.courseSelection ]
        };

        Cpi.SendApiRequest({
            method: "PUT",
            url: `/@/lesson`,
            data: JSON.stringify(params),
            success: (results, status, xhr) => {
                this.populateSchedule(results);
            }
        });
    }

    #viewLesson(header, target) {
        const lessonDate = header.prop("lessonDate");
        const editor = this.editorFromDate(lessonDate);
        const lessonId = editor.attr("id");
        window.open(`/lesson?id=${lessonId}${this.viewTracker.viewParams}`, target);
    }

    #viewCourses(header) {
        const lessonDate = header.prop("lessonDate");
        const editor = this.editorFromDate(lessonDate);

        this.schedulePage.selectedLessonId = editor.attr("id");
        this.schedulePage.setCourseSelection();
    }

    #viewRoadmap(header, target) {
        const lessonDate = header.prop("lessonDate");
        const editor = this.editorFromDate(lessonDate);
        const lesson = editor.prop("lesson");
        window.open(`/roadmap?subject=${lesson.subjectName}&grade=${lesson.gradeName}${this.viewTracker.viewParams}`, target);
    }

    #printLesson(header) {
        const lessonDate = header.prop("lessonDate");
        const editor = this.editorFromDate(lessonDate);
        const lessonData = editor.prop("lesson");
        const benchmarkContainer = editor.find(".benchmarkContainer");

        const lesson = {
            name: lessonData.lessonName,
            date: lessonData.lessonDate,
            benchmarks: [],
            details: {}
        };

        benchmarkContainer.find(".scheduleEditorBenchmark").each((key, value) => {
            const element = $(value);
            const benchmarkCode = element.find("a");
            lesson.benchmarks.push({
                code: benchmarkCode.text(),
                synopsis: benchmarkCode.attr("title")
            });
        });

        editor.find("#scheduleEditorDetails .scheduleEditorRow").each((key, value) => {
            const element = $(value);
            const detailLabel = element.find("label").text();
            const detailContent = element.find("textarea").val();
            lesson.details[detailLabel] = detailContent;
        });

        LessonApi.PrintLesson({
            title: `${lesson.name} - ${lesson.date}`,
            lessons: [ lesson ]
        });
    }

    #copyLesson(header) {
        this.#transferLesson(header, "copy", "Copy Lesson");
    }
    #cutLesson(header) {
        this.#transferLesson(header, "cut", "Move Lesson");
    }
    #transferLesson(header, action, title) {
        const columnId = header.attr("id");
        const editor = this.editorFromId(columnId);

        this.schedulePage.pickDate({
            title: title,
            from: header.prop("lessonDate"),
            accept: (results) => {
                const lesson = editor.prop("lesson");
                const params = {
                    lessons: [ lesson.lessonId ],
                    to: results.to,
                }

                Cpi.SendApiRequest({
                    method: "POST",
                    url: `/@/lesson/move?action=${action}`,
                    data: JSON.stringify(params),
                    success: (lessons) => {
                        this.schedulePage.navigateToDate(results.to);
                    }
                });
            }
        })
    }

    #bumpLesson(header) {
        this.bumpLessons(header, this.schedulePage.courseSelection.courseId, this.schedulePage.courseSelection.classId);
    }

    #clearLesson(header) {
       
        Cpi.ShowAlert({
            caption: "Confirm Clear",
            message: `Are you sure you want to clear this lesson?`,
            accept: () => {
                const columnId = header.attr("id");
                const editor = this.editorFromId(columnId);
                const lessonId = editor.attr("id");
                const lessonIds = [ lessonId ];

                if (lessonIds.length) {
                    Cpi.SendApiRequest({
                        method: "POST",
                        url: `/@/lesson/clear`,
                        data: JSON.stringify(lessonIds),
                        success: (data, status, xhr) => {
                            const benchmarkContainer = editor.find(".benchmarkContainer");
                            benchmarkContainer.empty();
                            editor.find("textarea").each((key, value) => {
                                $(value).val("");
                            });                
                        }
                    });
                }
            },
            acceptLabel: "Clear",
            closeLabel: "Cancel",
            maxMessageWidth: "fit-content"
        });
    }

    #deleteLesson(header) {
        const lessonDate = header.prop("lessonDate");
        const columnId = this.columnIdFromDate(lessonDate);
        const editor = this.editorFromDate(lessonDate);
        const lessonId = editor.attr("id");

        LessonApi.DeleteLesson(lessonId, () => {
            editor.remove();
            this.#enableActiveOptions(columnId, false);
        });
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