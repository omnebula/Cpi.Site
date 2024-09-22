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
            window.open(`/schedule?week=${Cpi.CalculateWeekNumber(data.lessonDate)}${this.#viewTracker.viewParams}`, "_self");
        });

        // Roadmap link.
        $("#viewRoadmap").on("click", () => {
            window.open(`/roadmap?subject=${data.subjectName}&grade=${data.gradeName}${this.#viewTracker.viewParams}`, "_self");
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
        const exclusions = {};
        $(".lessonBenchmarkRow").each((key, element) => {
            exclusions[element.id] = true;
        });

        this.#benchmarkPicker.show(exclusions, (benchmarks) => {
            this.#sendNewBenchmarks(benchmarks);
        });
    }

    #addBenchmarks(benchmarks) {
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
            benchmarks: []
        };

        for (const current of benchmarks) {
            params.benchmarks.push(current.benchmarkId);
        }

        Cpi.SendApiRequest({
            method: "PUT",
            url: "/@/lesson/benchmark",
            data: JSON.stringify(params),
            success: (data, status, xhr) => {
                this.#addBenchmarks(benchmarks);
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
}


class BenchmarkPicker {
    #benchmarkPicker = $("#benchmarkPicker");
    #pickerResults;
    #rowContainer;
    #rowTemplate;
    #exclusions;
    #subjectSelector;
    #gradeSelector;

    constructor(initialSubject, initialGrade) {
        // Extract pick list elements.
        this.#pickerResults = $("#benchmarkPickerResults");
        this.#rowContainer = this.#pickerResults.find("#benchmarkPickerRowContainer");
        this.#rowTemplate = this.#rowContainer.find("#benchmarkPickerRow").detach();
        this.#subjectSelector = $("#benchmarkPickerSearchSubject");
        this.#gradeSelector = $("#benchmarkPickerSearchGrade");

        // Initialize subject dropdown.
        for (const current of cpidata.organization.curriculum.search.subjects) {
            const option = document.createElement("option");
            option.text = current.name;
            option.grades = current.grades;
            this.#subjectSelector.append(option);
        }

        if (initialSubject) {
            this.#subjectSelector.val(initialSubject);
        }

        this.#syncGradeOptions(initialGrade);

        // Initialize option change handlers.
        this.#subjectSelector.on("change", () => {
            this.#syncGradeOptions();
            this.#searchBenchmarks();
        });

        this.#gradeSelector.on("change", () => {
            this.#searchBenchmarks();
        });

        // Initialize keyword input.
        const keyword = $("#benchmarkPickerSearchKeyword");
            
        keyword.on("keypress", (event) => {
            if (event.which == 13) {
                this.#searchBenchmarks();
            }
        });

        // Initialize show mode.
        const showMode = $("#benchmarkPickerShowMode");

        showMode.on("click", () => {
            if (showMode.val() === "Show All") {
                showMode.val("Show Unassigned");
            }
            else {
                showMode.val("Show All");
            }
            this.#searchBenchmarks();
        });
    }

    show(exclusions, success) {
        this.#exclusions = exclusions;
        this.#searchBenchmarks(success);
    }

    #syncGradeOptions(initialGrade) {
        initialGrade = initialGrade || this.#gradeSelector.val();

        this.#gradeSelector.empty();

        const selectedSubject = this.#subjectSelector.find(":selected");
        if (selectedSubject.length) {
            for (const grade of selectedSubject[0].grades) {
                this.#gradeSelector.append(`<option>${grade}</option>`);
            }
        }

        if (!initialGrade || (this.#gradeSelector.val(initialGrade).val() != initialGrade)) {
            this.#gradeSelector.val(this.#gradeSelector.find(":first").text());
        }
    }

    #searchBenchmarks(success) {
        const subject = this.#subjectSelector.val();
        const grade = this.#gradeSelector.val();
        const keyword = $("#benchmarkPickerSearchKeyword").val() || "";

        // N.B.: Query the opposite of what the button displays.
        const showMode = $("#benchmarkPickerShowMode").val() === "Show All" ? "unassigned" : "all";

        Cpi.SendApiRequest({
            method: "GET",
            url: `/@/curriculum/search?subject=${subject}&grade=${grade}&keyword=${keyword}&mode=${showMode}`,
            success: (data) => {
                this.#populateResults(data, success);

                // Show popup if a success handler was specified, i.e., called from show().
                if (success) {
                    this.#showPopup(success);
                }
            }
        });
    }

    #showPopup(success) {
        Cpi.ShowPopup(
            this.#benchmarkPicker,
            () => { this.#acceptSelection(success); }
        );                    
    }

    #populateResults(data, success) {
        this.#rowContainer.empty();

        for (const current of data) {
            if (this.#exclusions && this.#exclusions[current.benchmarkId]) {
                continue;
            }

            const row = this.#rowTemplate.clone(true);
            row.attr("referenceUrl", current.referenceUrl)
                .on("dblclick", () => {
                    row.find("input[type=checkbox]").prop("checked", true);
                    this.#benchmarkPicker.find("#popupAccept").trigger("click");
                });

            const checkbox = row.find("#benchmarkPickerCheckbox");
            checkbox.attr("id", current.benchmarkId);
    
            const code = row.find("#benchmarkPickerCode");
            code.text(current.standardCode).attr("href", current.referenceUrl);
            if (current.assigned) {
                code.css("text-decoration", "line-through");
            }
           
            const synopsis = row.find("#benchmarkPickerSynopsis");
            synopsis.html(current.synopsis);
            if (current.assigned) {
                synopsis.css("color", "#aaa");
            }
            synopsis.on("click", () => {
                checkbox.trigger("click");
            });

            this.#rowContainer.append(row);
        }

        this.#pickerResults.scrollTop(0);
    }

    #acceptSelection(success) {
        const container = $("#benchmarkPickerListResults");
        const selection = this.#rowContainer.find(":checkbox:checked");

        if (selection.length > 0) {
            const results = [];

            for (const current of selection) {
                const checkbox = $(current);
                const row = checkbox.parent().parent();
    
                const benchmark = {
                    benchmarkId: checkbox.attr("id"),
                    standardCode: row.find("#benchmarkPickerCode").text(),
                    synopsis: row.find("#benchmarkPickerSynopsis").text(),
                    referenceUrl: row.attr("referenceUrl")
                };
    
                results.push(benchmark);

                row.remove();
            }

            if (success) {
                success(results);
            }
        }
    }
}


window.page = new LessonPage();