
class BenchmarkPicker {
    #exclusions;
    #onSuccess;
    #resultRowTemplate = $(".benchmarkPickerListRow").detach();

    constructor() {
        $("#benchmarkPickerAccept").on("click", () => {
            this.#acceptSelection();
        });
        $("#benchmarkPickerCancel").on("click", () => {
            this.hide();
        });

        this.#init();
    }

    show(exclusions, onSuccess) {
        this.#exclusions = exclusions;
        this.#onSuccess = onSuccess;

        $("#benchmarkPickerPanel").css("display", "flex");
    }

    reset() {
        $("#benchmarkPickerListResults .benchmarkPickerListRow").remove();
    }

    hide() {
        this.reset();
        $("#benchmarkPickerPanel").hide();
    }

    #init() {
        const subjectDropdown = $("#benchmarkPickerSubject");
        for (const subjectName of cpidata.organization.curriculum.search.subjects) {
            subjectDropdown.append(`<option>${subjectName}</option>`);
        }

        const subject = localStorage.getItem("benchmarkPickerSubject");
        if (subject) {
            subjectDropdown.val(subject);
        }
        subjectDropdown.val(subject);

        const grade = localStorage.getItem("benchmarkPickerGrade");
        if (grade) {
            $("#benchmarkPickerGrade").val(grade);
        }

        const keyword = localStorage.getItem("benchmarkPickerKeyword");
        if (keyword) {
            $("#benchmarkPickerKeyword").val(grade);
        }

        $("#benchmarkPickerSearch").on("click", () => {
            const subject = $("#benchmarkPickerSubject").val();
            const grade = $("#benchmarkPickerGrade").val();
            const keyword = $("#benchmarkPickerKeyword").val();

            Cpi.SendApiRequest({
                method: "GET",
                url: `/@/curriculum/search?subject=${subject}&grade=${grade}&keyword=${keyword}`,
                success: (data) => {
                    this.#populateResults(data);
                    localStorage.setItem("benchmarkPickerSubject", subject);
                    localStorage.setItem("benchmarkPickerGrade", grade);
                    localStorage.setItem("benchmarkPickerKeyword", keyword);
                }
            });
        })
    }

    #populateResults(data) {
        const container = $("#benchmarkPickerListResults");

        container.find(".benchmarkPickerListRow").remove();

        for (const current of data) {
            if (this.#exclusions && this.#exclusions[current.benchmarkId]) {
                continue;
            }

            const row = this.#resultRowTemplate.clone(true);
            const rowCheck = row.find("#benchmarkPickerListCheckValue");
            const rowCode = row.find("#benchmarkPickerListCode");
            const rowSynopsis = row.find("#benchmarkPickerListSynopsis");

            row.attr("referenceUrl", current.referenceUrl);

            rowCheck.attr("id", current.benchmarkId);
    
            rowCode.text(current.standardCode);
            rowCode.attr("href", current.referenceUrl);
            
            rowSynopsis.html(current.synopsis);

            row.on("dblclick", () => {
                rowCheck.prop("checked", true);
                this.#acceptSelection();
            });

            container.append(row);
        }
    }

    #acceptSelection() {
        if (this.#onSuccess) {
            const container = $("#benchmarkPickerListResults");
            const selection = container.find(":checkbox:checked");

            if (selection.length > 0) {
                const results = [];
                for (const current of selection) {
                    const rowCheck = $(current);
                    const row = rowCheck.parent().parent();
                    const rowCode = row.find("#benchmarkPickerListCode");
                    const rowSynopsis = row.find("#benchmarkPickerListSynopsis");
        
                    const benchmark = {
                        benchmarkId: rowCheck.attr("id"),
                        standardCode: rowCode.text(),
                        synopsis: rowSynopsis.text(),
                        referenceUrl: row.attr("referenceUrl")
                    };
        
                    results.push(benchmark);
                }

                this.#onSuccess(results);

                selection.remove();
            }
        }

        this.hide();
    }
}
