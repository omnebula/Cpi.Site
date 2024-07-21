

class RoadmapPage extends CpiPage
{
    #benchmarkRowTemplate;
    #coverageRowTemplate;

    constructor() {
        super();

        this.#coverageRowTemplate = $("#benchmarkCoverage").detach();
        this.#benchmarkRowTemplate = $("#benchmarkRow").detach();

        this.sendApiRequest({
            method: "GET",
            url: "/@/lesson/coverage?subject=Mathematics&grade=3",
            success: (data, status, xhr) => {
                this.#populateResults(data);
            }
        });
    }

    #populateResults(data) {
        const benchmarkContainer = $("#benchmarkRowContainer");
        benchmarkContainer.children().remove();

        for (const standardCode in data) {
            const benchmarkInfo = data[standardCode];

            const benchmarkRow = this.#benchmarkRowTemplate.clone(true);
            benchmarkRow.find("#standardCode").text(standardCode);
            benchmarkRow.find("#standardDescription").html(benchmarkInfo.d);

            const coverageContainer = benchmarkRow.find("#benchmarkCoverageContainer");
            for (const date in benchmarkInfo.c) {
                const subjects = benchmarkInfo.c[date];

                const coverageRow = this.#coverageRowTemplate.clone(true);
                coverageRow.find("#coverageDate").text(date);
                coverageRow.find("#coverageSubject").text(subjects.join(", "));
                coverageContainer.append(coverageRow);
            }

            benchmarkContainer.append(benchmarkRow);
        }
    }
}

window.page = new RoadmapPage();