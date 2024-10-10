

class CoursePicker {
    #popup;
    #courseContainer;
    #subjectGradeMap = {};

    constructor(cpiPage) {
        this.#popup = $("#coursePicker");
        if (!this.#popup.length) {
            this.#popup = $(CoursePicker.#CoursePickerHtml);
            $(".popupFrame").append(this.#popup);
        }
        this.#courseContainer = this.#popup.find("#courseTableBody");

        const courses = cpiPage.accountData.options.courses;

        // Mass selection buttons.
        this.#popup.find("#selectAll").on("click", () => {
            this.#courseContainer.find("input[type=checkbox]").prop("checked", true);
        });
        this.#popup.find("#deselectAll").on("click", () => {
            this.#courseContainer.find("input[type=checkbox]").prop("checked", false);
        });

        // Lesson Date.
        new DateInput(this.#popup.find("#lessonDate"));

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

    static #CoursePickerHtml = String.raw`
        <div id="coursePicker" class="popupBox coursePicker">
            <div class="popupCaption pickerCaption">
                <div id="popupCaptionTitle" class="popupCaptionTitle">
                    <input id="selectAll" type="button" class="inputButton popupCaptionButton pickerSelectButton" value="Select All"/>
                    <input id="deselectAll" type="button" class="inputButton popupCaptionButton pickerSelectButton" value="Deselect All"/>
                </div>
                <div>
                    <input id="popupAccept" class="inputAcceptButton popupCaptionButton" type="button" value="Accept"/>
                    <input id="popupCancel" class="inputCancelButton popupCaptionButton" type="button" value="Cancel"/>
                </div>
            </div>
            <div class="popupRow pickerRow pickerDateRow">
                <div class="inputCell pickerDateCell">
                    <label class="popupLabel courseDateLabel">Lesson Date:</label><input id="lessonDate" class="inputTextBox courseLessonDate" type="text" autocomplete="off"/>
                </div>
            </div>
            <div class="popupRow pickerRow">
                <table id="courseTable" class="scrollTable listTable courseTable" cellpadding="0" cellspacing="0">
                    <thead>
                        <tr>
                            <th class="listTableHeader" colspan="2">Course</th>
                            <th class="listTableHeader classNameColumn">Class</th>
                        </tr>
                    </thead>
                    <tbody id="courseTableBody" class="courseTableBody">
                        <tr id="courseRow" class="listRow">
                            <td class="pickerListColumn pickerSelectColumn"><input class="pickerCheckbox" type="checkbox"/></td>
                            <td id="courseName" class="pickerListColumn pickerToggleColumn courseNameColumn"></td>
                            <td id="className" class="pickerListColumn pickerToggleColumn classNameColumn"></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
`;
}
