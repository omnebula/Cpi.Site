

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

        this.#initializeSubject(initialSubject, initialGrade);

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

    show(params) {
        if (params.initialSubject) {
            this.#initializeSubject(params.initialSubject, params.initialGrade);
        }

        this.#exclusions = params.exclusions;
        this.#searchBenchmarks(params.success);
    }

    #initializeSubject(subjectName, gradeName) {
        if (subjectName) {
            this.#subjectSelector.val(subjectName);
        }

        this.#syncGradeOptions(gradeName);
    }

    #syncGradeOptions(initialGrade) {
        initialGrade = initialGrade || this.#gradeSelector.val();

        this.#gradeSelector.empty();

        const selectedSubject = this.#subjectSelector.find(":selected");
        if (selectedSubject.length) {
            for (const grade of selectedSubject[0].grades) {
                this.#gradeSelector.append(`<option value="${grade}">${Cpi.FormatFullGradeName(grade)}</option>`);
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

