

class BenchmarkPicker {
    #benchmarkPicker = $("#benchmarkPicker");
    #pickerResults;
    #rowContainer;
    #rowTemplate;
    #assignments;
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

        showMode.on("change", () => {
            this.#searchBenchmarks();
        });
    }

    show(params) {
        if (params.initialSubject) {
            this.#initializeSubject(params.initialSubject, params.initialGrade);
        }

        this.#assignments = params.assignments;
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
        const showMode = $("#benchmarkPickerShowMode").val();

        Cpi.SendApiRequest({
            method: "GET",
            url: `/@/curriculum/search?subject=${subject}&grade=${grade}&keyword=${keyword}&mode=${showMode}`,
            success: (data) => {
                this.#populateResults(data);

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

    #populateResults(data) {
        this.#rowContainer.empty();

        for (const current of data) {
            const row = this.#rowTemplate.clone(true);
            row.attr("referenceUrl", current.referenceUrl)
                .on("dblclick", () => {
                    row.find("input[type=checkbox]").prop("checked", true);
                    this.#assignments[current.benchmarkId] = current.standardCode;
                    this.#benchmarkPicker.find("#popupAccept").trigger("click");
                });

            const checkbox = row.find("#benchmarkPickerCheckbox");
            checkbox.attr("id", current.benchmarkId);
            checkbox.on("click", () => {
                if (checkbox.prop("checked")) {
                    this.#assignments[current.benchmarkId] = current.standardCode;
                }
                else {
                    delete this.#assignments[current.benchmarkId];
                }
            });

            if (this.#assignments && this.#assignments[current.benchmarkId]) {
                checkbox.prop("checked", true);
            }
 
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
        if (success) {
            const results = [];
            for (const benchmarkId in this.#assignments) {
                results.push(benchmarkId);
            }

            success(results);
        }
    }
}

