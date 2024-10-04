class LessonPage extends CpiPage {
    #benchmarkTable;
    #benchmarkRowContainer;
    #benchmarkRowTemplate;
    #benchmarkPicker;
    #lessonId;
    #detailChanged;
    #readOnly;
    #viewTracker;

    constructor() {
        super();

        if (!this.validateLogin()) {
            return;
        }

        // Initialize Benchmark elements.
        this.#benchmarkTable = $("#lessonBenchmarkTable");
        this.#benchmarkRowContainer = $("#lessonBenchmarkRowContainer");
        this.#benchmarkRowTemplate = this.#benchmarkRowContainer.find(".lessonBenchmarkRow").detach();

        // Detect view-only mode.
        this.#viewTracker = new ViewTracker();

        if (this.#viewTracker.isActive) {
            this.#setReadOnly();
        }
        else {
            $("#mySchedule").css("display", "none");

            $("#lessonBenchmarkSection").on("mouseup", (event) => {
                if (event.which === 1) {
                    this.#showBenchmarkPicker();
                }
            });
    
            this.#benchmarkRowContainer.on("mouseup", (event) => {
                event.stopPropagation();
            });

            $(".lessonDetailText")
                .on("change", () => {
                    this.#detailChanged = true;
                })
                .on("blur", () => {
                    this.#sendUpdatedDetails();
                })
                .on("keydown", (event) => {
                    if (event.ctrlKey && (event.keyCode === 13)) {
                        this.#sendUpdatedDetails();
                    }
                });
        }

        $("#printLesson").on("click", () => {
            this.#printLesson();
        })

        this.#lessonId = this.#viewTracker.searchParams.get("id");

        Cpi.ShowAppFrame();

        Cpi.SendApiRequest({
            method: "GET",
            url: `/@/lesson/${this.#lessonId}`,
            success: (data, status, xhr) => {
                this.#init(data);
            }
        });
    }

    #init(data) {
        if (data.readOnly) {
            this.#setReadOnly();
        }
        else {
            this.#benchmarkPicker = new BenchmarkPicker(data.subjectName, data.gradeName);
        }

        // Name
        const lessonName = $("#lessonName");
        lessonName.text(data.lessonName);

        if (data.siblings.lessons.previousId) {
            $("#viewPreviousLesson")
                .prop("title", data.siblings.lessons.previousName)
                .on("click", () => {
                    window.location.href = `/lesson?id=${data.siblings.lessons.previousId}${this.#viewTracker.viewParams}`;
                })
                .prop("disabled", false);
        }
        if (data.siblings.lessons.nextId) {
            $("#viewNextLesson")
                .prop("title", data.siblings.lessons.nextName)
                .on("click", () => {
                    window.location.href = `/lesson?id=${data.siblings.lessons.nextId}${this.#viewTracker.viewParams}`;
                })
                .prop("disabled", false);
        }

        // Date
        $("#lessonDate").text(Cpi.FormatShortDateString(data.lessonDate, true));

        if (data.siblings.dates.previousId) {
            $("#viewPreviousDay")
                .prop("title", Cpi.FormatShortDateString(data.siblings.dates.previousDate))
                .on("click", () => {
                    window.location.href = `/lesson?id=${data.siblings.dates.previousId}${this.#viewTracker.viewParams}`;
                })
                .prop("disabled", false);
        }
        if (data.siblings.dates.nextId) {
            $("#viewNextDay")
                .prop("title", Cpi.FormatShortDateString(data.siblings.dates.nextDate))
                .on("click", () => {
                    window.location.href = `/lesson?id=${data.siblings.dates.nextId}${this.#viewTracker.viewParams}`;
                })
                .prop("disabled", false);
        }

        $(".navigationTitleGroup").css("visibility", "visible");

        // Schedule link.
        $("#viewSchedule").on("click", () => {
            Cpi.OpenLocation(
                `/schedule?week=${Cpi.CalculateWeekNumber(data.lessonDate)}${this.#viewTracker.viewParams}`,
                "_self",
                { lessonId: data.lessonId, courseId: data.courseId, classId: data.classId }
            );
        });

        // Roadmap link.
        $("#viewRoadmap").on("click", () => {
            Cpi.OpenLocation(
                `/roadmap?${this.#viewTracker.viewParams}`,
                "_self",
                { lessonId: data.lessonId, subjectName: data.subjectName, gradeName: data.gradeName}
            );
        });

        // Benchmarks
        this.#addBenchmarks(data.benchmarks);

        // Details
        const texts = $(".lessonDetailText");
        texts.each((key, element) => {
            const detailName = element.id;
            const detailText = data.details ? (data.details[detailName] || "") : "";
            $(element).val(detailText);
        });
    }

    #showBenchmarkPicker() {
        const assignments = {};
        $(".lessonBenchmarkRow").each((key, value) => {
            const element = $(value);
            assignments[element.attr("id")] = element.find("#lessonBenchmarkCode").text();
        });

        this.#benchmarkPicker.show({
            assignments: assignments,
            success: (benchmarks) => {
                this.#sendNewBenchmarks(benchmarks);
            }
        });
    }

    #addBenchmarks(benchmarks) {
        this.#benchmarkRowContainer.empty();

        for (const current of benchmarks) {
            const row = this.#benchmarkRowTemplate.clone(true);
            const lessonBenchmarkCode = row.find("#lessonBenchmarkCode");
            const lessonBenchmarkSynopsis = row.find("#lessonBenchmarkSynopsis");
            const lessonBenchmarkDelete = row.find("#lessonBenchmarkDelete");

            row.prop("id", current.benchmarkId);

            lessonBenchmarkCode
                .attr("href", current.referenceUrl)
                .attr("target", "_blank")
                .text(current.standardCode);

            lessonBenchmarkSynopsis.html(current.synopsis);

            if (this.#readOnly) {
                row.find("#lessonBenchmarkDelete").css("visibility", "hidden");
                row.find(".lessonBenchmarkCodeColumn").addClass("lessonBenchmarkCodeColumn_readonly");
            }
            else {
                lessonBenchmarkSynopsis.on("mouseup", (event) => {
                    // If left-button clicked and no selection, propagate to parent, i.e. open picker.
                    if (event.which === 1) {
                        const selection = document.getSelection();
                        if (selection && !selection.toString()) {
                            this.#showBenchmarkPicker();
                        }
                    }
                });

                row.find("#lessonBenchmarkDelete").on("click", (event) => {
                    event.stopPropagation();
                    this.#removeBenchmark(current.benchmarkId);
                });
            }

            this.#benchmarkRowContainer.append(row);
        }
    }

    #sendNewBenchmarks(benchmarks) {
        const params = {
            lessonId: this.#lessonId,
            benchmarks: benchmarks
        };

        Cpi.SendApiRequest({
            method: "PUT",
            url: "/@/lesson/benchmark",
            data: JSON.stringify(params),
            success: (data, status, xhr) => {
                this.#addBenchmarks(data);
            }
        });
    }

    #removeBenchmark(benchmarkId) {
        const params = {
            lessonId: this.#lessonId,
            benchmarkId: benchmarkId
        };

        Cpi.SendApiRequest({
            method: "DELETE",
            url: "/@/lesson/benchmark",
            data: JSON.stringify(params),
            success: (data, status, xhr) => {
                $(`#${benchmarkId}`).remove();
            }
        });
    }

    #sendUpdatedDetails() {
        if (!this.#detailChanged) {
            return;
        }

        const params = {
            details: {}
        };
        $(".lessonDetailText").each((key, element) => {
            const detailName = element.id;
            params.details[detailName] = $(element).val();
        });

        Cpi.SendApiRequest({
            method: "PATCH",
            url: `/@/lesson/${this.#lessonId}?noecho`,
            data: JSON.stringify(params),
            success: (data, status, xhr) => {
                this.#detailChanged = false;
            },
            hideSpinner: true
        });
    }

    #setReadOnly() {
        this.#readOnly = true;

        // Initialize benchmark background.
        $("#lessonBenchmarkSection").addClass("lessonBenchmarkSection_readonly");

        // Initialize all text boxes.
        $(".lessonDetailText").prop("readonly", true);
    }

    #printLesson() {
        const params = {
            name: $("#lessonName").text(),
            date: $("#lessonDate").text(),
            benchmarks: [],
            details: {}
        };

        $(".lessonBenchmarkRow").each((key, value) => {
            const element = $(value);
            const benchmarkCode = element.find("#lessonBenchmarkCode").text();
            const benchmarkSynopsis = element.find("#lessonBenchmarkSynopsis").text();
            params.benchmarks.push({
                code: benchmarkCode,
                synopsis: benchmarkSynopsis
            });
        });

        $(".lessonDetailSection").each((key, value) => {
            const element = $(value);
            const detailLabel = element.find("label").text();
            const detailContent = element.find("textarea").val();
            params.details[detailLabel] = detailContent;
        });

        LessonApi.PrintLesson(params);
    }
}



window.page = new LessonPage();