

class RoadmapPage extends CpiPage
{
    #pageData;
    #viewTracker;
    #overlayController;

    constructor() {
        super();

        if (!this.validateLogin()) {
            return;
        }

        // Detect view-only mode.
        this.#viewTracker = new ViewTracker();

        const pageDataSetting = localStorage.getItem("roadmapData");
        if (pageDataSetting) {
            this.#pageData = JSON.parse(pageDataSetting);
        }
        else {
            this.#pageData = {};
        }

        // Compute the initial overlay.
        var initialOverlayName;

        // If view-only mode, hide the disabled "roadmap" menu and show the live option
        // so the use can return to their recpective rodamap.
        if (this.isViewOnly) {
            $("#myRoadmap").css("display", "inline-block");
            $(".siteCurrentMenuOption").css("display", "none");

            this.pageData.benchmarks.lastSubject = "";
            this.pageData.benchmarks.lastGrade = "";
            this.pageData.benchmarks.lastScope = "all";

            initialOverlayName = "Summary";
        }
        // If not view-only mode, hide the live option and show the disabled one
        // since we're already on the user's roadmap page.
        else {
            $("#myRoadmap").css("display", "none");
        }

        // CHeck if subject and grade were specified by referrer, e.g., from lesson page.
        // Note that this will override default or view-only settings/
        const searchSubject = this.viewTracker.searchParams.get("subject");
        const searchGrade = this.viewTracker.searchParams.get("grade");
        if (searchSubject && searchGrade) { // all or nothing
            this.#pageData.benchmarks.lastSubject = searchSubject;
            this.#pageData.benchmarks.lastGrade = searchGrade;
            this.#pageData.benchmarks.lastScope = "all";

            initialOverlayName = "Benchmarks";
        }

        const overlays = [
            new SummaryOverlay(this),
            new BenchmarkOverlay(this)
        ];
        this.#overlayController = new OverlayController(overlays, "roadmapOverlayName", initialOverlayName);

        Cpi.ShowAppFrame();
    }

    get viewTracker() {
        return this.#viewTracker;
    }
    get isViewOnly() {
        return this.#viewTracker.isActive;
    }

    get overlayController() {
        return this.#overlayController;
    }

    get pageData() {
        return this.#pageData;
    }
    savePageData() {
        // Save data only if we're not in view-only mode.
        if (!this.isViewOnly) {
            localStorage.setItem("roadmapData", JSON.stringify(this.#pageData));
        }
    }

    showBenchmarks(subject, grade) {
        this.#pageData.benchmarks.lastSubject = subject;
        this.#pageData.benchmarks.lastGrade = grade;
        this.#overlayController.showOverlay("Benchmarks");
    }
}


class RoadmapOverlay extends OverlayContext {
    #roadmapPage;

    constructor(roadmapPage, settings) {
        super(settings);

        this.#roadmapPage = roadmapPage;
    }

    get roadmapPage() {
        return this.#roadmapPage;
    }

    get isViewOnly() {
        return this.#roadmapPage.isViewOnly;
    }
    get viewTracker() {
        return this.#roadmapPage.viewTracker;
    }

    get overlayController() {
        return this.#roadmapPage.overlayController;
    }

    get pageData() {
        return this.#roadmapPage.pageData;
    }
    savePageData() {
        this.#roadmapPage.savePageData();
    }
}


class SummaryOverlay extends RoadmapOverlay {
    #initialized;
    #assignedCount = 0;
    #totalCount = 0;
    #tableController;

    constructor(roadmapPage) {
        super(roadmapPage, { overlayName: "Summary" });

        this.#tableController = new TableController({
                table: $("#summaryTable"),
                toggleButtons: [ $("#viewSummaryBenchmarks")]
            }
        );

        if (this.isViewOnly) {
            this.viewTracker.initViewProgressButton(this.element.find("#viewProgress"));
            this.element.find("#viewOnlyButtons").css("visibility", "visible");
        }

        const viewBenchmarksButton = $("#viewSummaryBenchmarks");
        viewBenchmarksButton.on("click", () => {
            const row = this.#tableController.getSelectedRow();
            if (row) {
                const subject = row.find("#summarySubject").text();
                const grade = row.find("#summaryGrade").text();
                this.roadmapPage.showBenchmarks(subject, grade);
            }
        });

        this.#tableController._formatRow = (row, data) => {
            row.attr("id", this.#formatSummaryId(data.subject, data.grade));

            row.find("#summarySubject").text(data.subject);
            row.find("#summaryGrade").text(data.grade);

            const percentage = (data.assigned / data.total) * 100;
            row.find("#summaryProgress").text(`${percentage.toFixed(1)}% (${data.assigned}/${data.total})`);

            row.on("dblclick", () => {
                this.roadmapPage.showBenchmarks(data.subject, data.grade);
            });

            this.#assignedCount += data.assigned;
            this.#totalCount += data.total;
        };
    }

    _activateOverlay() {
        if (this.#initialized) {
            this.#syncSelectedStat();
        }
        else {
            Cpi.SendApiRequest({
                method: "GET",
                url: `/@/lesson/roadmap/summary?teacherId=${this.viewTracker.teacherId || ""}`,
                success: (data) => {
                    this.#tableController.setRows(data);

                    const percentage = (this.#assignedCount / this.#totalCount) * 100;
                    const progress = `${percentage.toFixed(1)}% (${this.#assignedCount}/${this.#totalCount})`;
                    $("#summaryStatsText").text(progress);

                    this.#syncSelectedStat();

                    this.#initialized = true;
                }
            });
        }
    }

    #syncSelectedStat() {
        const id = this.#formatSummaryId(this.pageData.benchmarks.lastSubject, this.pageData.benchmarks.lastGrade);
        if (id !== "#") {
            const row = $(document.getElementById(id));
            if (row.length) {
                this.#tableController.setSelectedRow(row);
            }
        }
        super._activateOverlay();
    }

    #formatSummaryId(subject, grade) {
        return `#${subject}${grade}`.replace(/ /g, '-');
    }
}


class BenchmarkOverlay extends RoadmapOverlay  {
    #roadmapTable;
    #lessonTemplate;
    #subjectSelector;
    #gradeSelector;
    #scopeSelector;
    #referrerLessonId;

    constructor(roadmapPage) {
        super(
            roadmapPage, { overlayName: "Benchmarks" }
        );

        // Extract the lesson bubble template.
        this.#lessonTemplate = $("#lessonBubble").detach();

        // Initialize the roadmap table
        this.#roadmapTable = new DataTable($("#roadmapTable"));

        if (!this.pageData.benchmarks) {
            this.pageData.benchmarks = {
                lastSubject: this.pageData.lastSubject || localStorage.getItem("lastRoadmapSubject") || "",
                lastGrade: this.pageData.lastGrade || localStorage.getItem("lastRoadmapGrade") || "",
                lastScope: this.pageData.lastScope || localStorage.getItem("lastRoadmapScope") || "all"
            };
            this.pageData.lastSubject = undefined;
            this.pageData.lastGrade = undefined;
            this.pageData.lastScope = undefined;
            localStorage.removeItem("lastRoadmapSubject");
            localStorage.removeItem("lastRoadmapGrade");
            localStorage.removeItem("lastRoadmapScope");

            this.savePageData();
        }

        /*
        * Initialize selectors
        */
        this.#subjectSelector = $("#subjectSelector");
        this.#gradeSelector = $("#gradeSelector");
        this.#scopeSelector = $("#scopeSelector");

        // Subject selector
        if (!this.viewTracker.teacherId) {
            for (const subject of roadmapPage.accountData.options.subjects) {
                const option = document.createElement("option");
                option.text = subject.name;
                option.grades = subject.grades;
                this.#subjectSelector.append(option);
            }

            this.#syncSubjectGradeOptions();
        }

        this.#subjectSelector.on("change", () => {
            this.pageData.benchmarks.lastSubject = this.#subjectSelector.val();
            this.#syncSubjectGradeOptions();
            this.#queryBenchmarks();
            this.savePageData();
        });

        // Grade selector
        this.#gradeSelector.on("change", () => {
            this.pageData.benchmarks.lastGrade = this.#gradeSelector.val();
            this.#queryBenchmarks();
            this.savePageData();
        });

        // Scope selector
        this.#scopeSelector.val(this.pageData.benchmarks.lastScope);
        this.#scopeSelector.on("change", () => {
            this.pageData.benchmarks.lastScope = this.#scopeSelector.val();
            this.#queryBenchmarks();
            this.savePageData();
        });

        // Referrer Lesson
        const referrer = new URL(document.referrer);
        if (referrer.pathname === "/lesson") {
            this.#referrerLessonId = referrer.searchParams.get("id");
        }
    }

    _activateOverlay() {
        this.#queryBenchmarks((data) => {
            super._activateOverlay();

            // Disable any subsequent referrer-lesson processing.
            this.#referrerLessonId = null;
        });
    }

    #syncSubjectGradeOptions() {
        this.#gradeSelector.empty();

        const selectedSubject = this.#subjectSelector.find(":selected");
        if (selectedSubject.length) {
            const grades = selectedSubject[0].grades;

            for (const grade of grades) {
                const option = document.createElement("option");
                option.value = option.text = grade;
                this.#gradeSelector.append(option);
            }
        }

        var currentGrade = this.pageData.benchmarks.lastGrade;
        if (!currentGrade || (this.#gradeSelector.val(currentGrade).val() !== currentGrade)) {
            currentGrade = this.#gradeSelector.find(":first").val();
            this.pageData.benchmarks.lastGrade = currentGrade;
            this.#gradeSelector.val(currentGrade);
            this.savePageData();
        }    
    }

    #queryBenchmarks(successHandler) {
        // Build basic query url.
        var subject = this.pageData.benchmarks.lastSubject || "";
        var grade = this.pageData.benchmarks.lastGrade || "";
        var queryUrl = `/@/lesson/roadmap/benchmarks?subject=${subject}&grade=${grade}&scope=${this.pageData.benchmarks.lastScope}`;

        // Append teacherId if viewing a specific teacher, i.e., via progress page.
        if (this.viewTracker.teacherId) {
            queryUrl += `&teacherId=${this.viewTracker.teacherId}`;
        }

        // Request subject and grade options if the selectors are currently empty.
        if (!this.#subjectSelector.find(":first").length) {
            queryUrl += "&wantOptions";
        }

        Cpi.SendApiRequest({
            method: "GET",
            url: queryUrl,
            success: (data, status, xhr) => {
                this.#populateUI(data);

                if (data.stats) {
                    const percentage = (data.stats.assigned / data.stats.total) * 100;
                    const progress = `${percentage.toFixed(1)}% (${data.stats.assigned}/${data.stats.total})`;
                    $("#benchmarkStatsText").text(progress);
                }

                if (successHandler) {
                    successHandler(data);
                }
            }
        });
    }

    #populateUI(data) {
        // Conditionally sync selected optionsreturned from the server.
        if (data.selected) {
            this.pageData.benchmarks.lastSubject = data.selected.subject;
            this.pageData.benchmarks.lastGrade = data.selected.grade;
        }

        // Conditionally sync subject and grade selector options.
        if (data.options) {
            this.#subjectSelector.empty();

            for (const subject of data.options.subjects) {
                const option = document.createElement("option");
                option.text = subject.name;
                option.grades = subject.grades;
                this.#subjectSelector.append(option);
            }
            
            this.#syncSubjectGradeOptions();
        }

        // Sync selected options.
        this.#subjectSelector.val(this.pageData.benchmarks.lastSubject);
        this.#gradeSelector.val(this.pageData.benchmarks.lastGrade);
        this.#scopeSelector.val(this.pageData.benchmarks.lastScope);

        // Populate benchmark table.
        this.#roadmapTable.empty();

        for (const benchmark of data.benchmarks) {
            this.#roadmapTable.appendRow(benchmark, (row, benchmark) => {
                const benchmarkCode = row.find("#benchmarkCode");
                benchmarkCode.text(benchmark.code);
                benchmarkCode.attr("href", benchmark.url);

                const synopsis = row.find("#benchmarkSynopsis");
                synopsis.html(benchmark.synopsis);

                var isReferrerLesson = false;
                if (benchmark.lessons.length) {
                    synopsis.addClass("benchmarkSynopsis_assigned");

                    const lessonColumn = row.find("#benchmarkLesson");
                    for (const lesson of benchmark.lessons) {
                        const lessonBubble = this.#lessonTemplate.clone(true);
    
                        lessonBubble.find("#lessonName").text(lesson.name);
    
                        lessonBubble.find("#lessonDate").text(Cpi.FormatShortDateString(lesson.date));
    
                        lessonBubble.find("#lessonLink").attr("href", `/lesson?id=${lesson.id}${this.viewTracker.viewParams}`);
    
                        lessonColumn.append(lessonBubble);

                        isReferrerLesson = isReferrerLesson || (lesson.id === this.#referrerLessonId);
                    }

                    if (isReferrerLesson) {
                        row.addClass("benchmarkReferredRow");
                    }
                }
            });
        }

        this.#roadmapTable.stripeRows();
    }

}


window.page = new RoadmapPage();