

class ProgressPage extends CpiPage {
    #overlayController;

    constructor() {
        super();

        if (!this.validateLogin()) {
            return;
        }

        const overlays = [
            new TeacherOverlay()
        ];
        this.#overlayController = new OverlayController(overlays, "progressOverlayName");

        Cpi.ShowAppFrame();
    }
}


class TeacherOverlay extends TableOverlay {
    constructor() {
        super({
            overlayName: "Teachers",
            table: $("#teacherTable"),
            toggleButtons: [ $("#viewTeacherSchedule"), $("#viewTeacherRoadmap") ],
        });

        $("#viewTeacherSchedule").on("click", (event) => {
            this.#viewAccountDetail("schedule", event.ctrlKey);
        });
        $("#viewTeacherRoadmap").on("click", (event) => {
            this.#viewAccountDetail("roadmap", event.ctrlKey);
        });

        this._compareRows = undefined;
    }

    refreshRows() {
        Cpi.SendApiRequest({
            method: "GET",
            url: "/@/lesson/progress?type=teacher",
            success: (data, status, xhr) => {
                this.setRows(data);

                // Conditionally set the current selection.
                const url = new URL(document.referrer);
                const teacherId = url.searchParams.get("tid");
                if (teacherId) {
                    const row = this.findRows(`#${teacherId}`);
                    if (row) {
                        this.setSelectedRow(row);
                    }
                }
            }
        });
    }

    _formatRow(row, teacher) {
        row.attr("id", teacher.id);

        row.find("#teacherNameColumn").text(`${teacher.lastName}, ${teacher.firstName}`);

        const percentage = (teacher.benchmarks.assigned / teacher.benchmarks.total) * 100;
        row.find("#statsPercentage").text(`${percentage.toFixed(1)}%`);
        row.find("#statsTotals").text(`(${teacher.benchmarks.assigned}/${teacher.benchmarks.total})`);
    }

    #viewAccountDetail(pathname, openNewTab) {
        const row = this.tableController.getSelectedRow();
        if (row) {
            const teacherId = row.attr("id");
            const teacherName = row.find("#teacherNameColumn").text();
            window.open(`/${pathname}?tid=${teacherId}&tname=${teacherName}&orig=progress`, openNewTab ? "_blank" : "_self");
        }
    }
}


window.page = new ProgressPage();