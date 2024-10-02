

class ProgressPage extends CpiPage {
    #overlayController;

    constructor() {
        super();

        if (!this.validateLogin()) {
            return;
        }

        const overlays = [
            new BenchmarkOverlay()
        ];
        this.#overlayController = new OverlayController(overlays, "progressOverlayName");

        Cpi.ShowAppFrame();
    }
}


class BenchmarkOverlay extends TableOverlay {
    constructor() {
        super({
            overlayName: "Benchmarks",
            table: $("#benchmarkTable"),
            toggleButtons: [ $("#viewBenchmarkSchedule"), $("#viewBenchmarkRoadmap") ],
        });

        $("#viewBenchmarkSchedule").on("click", (event) => {
            this.#viewAccountDetail("schedule", event.ctrlKey);
        });
        $("#viewBenchmarkRoadmap").on("click", (event) => {
            this.#viewAccountDetail("roadmap", event.ctrlKey);
        });

        this._compareRows = undefined;
    }

    refreshRows() {
        Cpi.SendApiRequest({
            method: "GET",
            url: "/@/lesson/progress?type=benchmark",
            success: (data, status, xhr) => {
                this.setRows(data);

                // Conditionally set the current selection.
                const url = new URL(document.referrer);
                const benchmarkId = url.searchParams.get("tid");
                if (benchmarkId) {
                    const row = this.findRows(`#${benchmarkId}`);
                    if (row) {
                        this.setSelectedRow(row);
                    }
                }
            }
        });
    }

    _formatRow(row, benchmark) {
        row.attr("id", benchmark.id);

        row.find("#benchmarkNameColumn").text(`${benchmark.lastName}, ${benchmark.firstName}`);

        const percentage = (benchmark.benchmarks.assigned / benchmark.benchmarks.total) * 100;
        row.find("#statsPercentage").text(`${percentage.toFixed(1)}%`);
        row.find("#statsTotals").text(`(${benchmark.benchmarks.assigned}/${benchmark.benchmarks.total})`);
    }

    #viewAccountDetail(pathname, openNewTab) {
        const row = this.tableController.getSelectedRow();
        if (row) {
            const benchmarkId = row.attr("id");
            const benchmarkName = row.find("#benchmarkNameColumn").text();
            window.open(`/${pathname}?tid=${benchmarkId}&tname=${benchmarkName}&orig=progress`, openNewTab ? "_blank" : "_self");
        }
    }
}


window.page = new ProgressPage();