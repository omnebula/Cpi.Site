

class CoursePicker {
    #popup = $("#coursePicker");
    #courseContainer = $("#courseTableBody");

    constructor(cpiPage) {

        const courses = cpiPage.accountData.options.courses;

        // Mass selection buttons.
        this.#popup.find("#selectAll").on("click", () => {
            this.#courseContainer.find("input[type=checkbox]").prop("checked", true);
        });
        this.#popup.find("#deselectAll").on("click", () => {
            this.#courseContainer.find("input[type=checkbox]").prop("checked", false);
        });

        // Lesson Date.
        Cpi.InitAutoDateFormatter(this.#popup.find("#lessonDate"));

        // Init table contents
        const courseRowTemplate = this.#courseContainer.find("#courseRow").detach();
        
        for (const current of courses) {
            const row = courseRowTemplate.clone(true);

            row.attr("id", current.courseId + current.classId);
            row.attr("courseId", current.courseId);
            row.attr("classId", current.classId);
            row.find("#courseName").text(current.courseName);
            row.find("#className").text(current.className);

            row.find(".pickerToggleColumn").on("click", () => {
                row.find(".pickerCheckbox").trigger("click");
            });
            row.find(".pickerToggleColumn").on("dblclick", () => {
                row.find(".pickerCheckbox").trigger("click");
                this.#popup.find("#popupAccept").trigger("click");
            });

            this.#courseContainer.append(row);
        }
    }

    show(params) {
        this.#popup.find("#lessonDate").val(params.lessonDate ? Cpi.FormatShortDateString(params.lessonDate) : "");

        this.#courseContainer.children().css("display", "table-row");
        this.#courseContainer.find("input:checked").prop("checked", false);

        if (params.exclusions) {
            for (const current of params.exclusions) {
                this.#courseContainer.find(`#${current}`).css("display", "none");
            }
        }

        Cpi.ShowPopup(this.#popup, () => {
            this.#acceptSelection(params.accept);
        });
    }

    #acceptSelection(accept) {
        const lessonDate = this.#popup.find("#lessonDate").val();
        if (lessonDate === "") {
            Cpi.ShowAlert({
                message: "Please enter a valid lesson date.",
                close: () => {
                    Cpi.ShowPopup(this.#popup, () => {
                        this.#acceptSelection(params.accept);
                    });
                }
            });
        }
        else {
            const checkboxes = this.#courseContainer.find("input:checked");
            if (checkboxes.length > 0) {
                const result = {
                    lessonDate: Cpi.ShortDateToIsoString(this.#popup.find("#lessonDate").val()),
                    selection: []
                };
        
                for (const current of checkboxes) {
                    const row = $(current).parent().parent();
                    if (row.css("display") !== "none") {
                        result.selection.push({
                            courseId: row.attr("courseId"),
                            classId: row.attr("classId")
                        });
                    }
                }
        
                accept(result);
            }
        }
    }
}
