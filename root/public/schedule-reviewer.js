

class ScheduleReviewer extends ScheduleController {
    #editorTemplate;
    #shadowParent;

    constructor(schedulePage) {
        super(schedulePage);

        this.#editorTemplate = $(".scheduleEditor").detach();
        this.#shadowParent = $("#shadowParent");
    }

    activate() {
        const selection = this.schedulePage.selectedCourseValue;
        if (!selection) {
            return;
        }
        
        const parts = selection.split("_");
        const courseId = parts[0];
        const classId = parts[1];

        const quryUrl = this.queryUrl + `&courseId=${courseId}&classId=${classId}`;

        this.fetchLessons(quryUrl, (data) => {
            this.populateSchedule(data);

            // SHow reviewer -mode column dropdown menus.
            $(".reviewerColumnMenuOptions").css("display", "block");

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

            // Add benchmarks.
            const benchmarkContainer = editor.find(".benchmarkContainer");
            if (lesson.benchmarks.length) {
                for (const benchmark of lesson.benchmarks) {
                    benchmarkContainer.append(`<a href="${benchmark.referenceUrl}" target="_blank" title="${benchmark.synopsis}">${benchmark.standardCode}</a>`);
                }
            }
            else {
                benchmarkContainer.html("&nbsp;");
            }

            // Initialize details.
            for (const key in lesson.details) {
                const value = lesson.details[key];
                const textarea = editor.find(`#${key}`);
                textarea.val(value);
            }
                
            // Insert editor into container.
            const container = this.containerFromDate(Cpi.ParseLocalDate(lesson.lessonDate));
            container.append(editor);

            // Apply autogrow to text areas after adding to document so that it has actual dimensions.
            const textareas = editor.find(".scheduleEditorTextarea");
            textareas.autogrow({ shadowParent: this.#shadowParent });

            // Hook into blu event to detect changes
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
                                success: () => {
                                    changed = false;
                                }
                            })
                        }
                    })
                    .on("change", () => {
                        changed = true;
                    });

                const row = textarea.parent();
                const label = row.find("label");
                label.on("click", () => {
                    textarea.focus();
                });
            });
        }
    }
}