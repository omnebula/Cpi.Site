

class CoursePicker {
    #popup = $("#coursePicker");
    #courseContainer = $("#courseTableBody");
    #subjectGradeMap = {};

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
        new DatePicker(this.#popup.find("#lessonDate"));

        // Init table contents
        const courseRowTemplate = this.#courseContainer.find("#courseRow").detach();
        
        for (const current of courses) {
            const row = courseRowTemplate.clone(true);
            row[0].course = current;

            const checkbox = row.find(".pickerCheckbox");

            row.attr("id", current.courseId + current.classId);
            row.find("#courseName").text(current.courseName);
            row.find("#className").text(current.className);

            row.find(".pickerToggleColumn").on("click", () => {
                checkbox.trigger("click");
            });
            row.find(".pickerToggleColumn").on("dblclick", () => {
                checkbox.trigger("click");
                this.#popup.find("#popupAccept").trigger("click");
            });

            this.#courseContainer.append(row);

            this.#subjectGradeMap[current.subjectName + current.gradeName] = checkbox;
        }
    }

    show(params) {
        this.#popup.find("#lessonDate").val(params.lessonDate ? Cpi.FormatShortDateString(params.lessonDate) : "");

        this.#courseContainer.children().css("display", "table-row");
        this.#courseContainer.find("input:checked").prop("checked", false);

        if (params.selection) {
            const key = params.selection.subject + params.selection.grade;
            const checkbox = this.#subjectGradeMap[key];
            checkbox.prop("checked", true);
        }

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
        const $lessonDate = this.#popup.find("#lessonDate");
        const lessonDate = $lessonDate.val();
        if ((lessonDate === "") || (lessonDate === "Invalid Date")) {
            Cpi.ShowAlert({
                message: "Please enter a valid lesson date.",
                close: () => {
                    $lessonDate.val("");

                    Cpi.ShowPopup(this.#popup, () => {
                        this.#acceptSelection(accept);
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
                        const course = row[0].course;

                        result.selection.push({
                            courseId: course.courseId,
                            classId: course.classId
                        });
                    }
                }
        
                accept(result);
            }
        }
    }
}
