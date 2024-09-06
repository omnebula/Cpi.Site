

class RoadmapPage extends CpiPage
{
    #roadmapTable;
    #lessonTemplate;
    #subjectSelector;
    #gradeSelector;
    #scopeSelector;
    #pageData;
    #teacherId;
    #extraParams = "";

    constructor() {
        super();

        if (!this.validateLogin()) {
            return;
        }

        // Extract the lesson bubble template.
        this.#lessonTemplate = $("#lessonBubble").detach();

        // Initialize the roadmap table
        this.#roadmapTable = new DataTable($("#roadmapTable"));


        const pageDataSetting = localStorage.getItem("roadmapData");
        if (pageDataSetting) {
            this.#pageData = JSON.parse(pageDataSetting);
        }
        else {
            this.#pageData = {
                lastSubject: localStorage.getItem("lastRoadmapSubject") || "",
                lastGrade: localStorage.getItem("lastRoadmapGrade") || "",
                lastScope: localStorage.getItem("lastRoadmapScope") || "all"
            };
            localStorage.removeItem("lastRoadmapSubject");
            localStorage.removeItem("lastRoadmapGrade");
            localStorage.removeItem("lastRoadmapScope");

            this.#savePageData();
        }

        // Detect administrative access, i.e., from Organization Manager.
        const searchParams = new URLSearchParams(window.location.search);
        const referrerUrl = new URL(document.referrer);
        this.#teacherId = searchParams.get("tid");
        const teacherName = searchParams.get("tname");
        if (this.#teacherId && teacherName) {
            $(document.documentElement).addClass("theme-view-only");
            this.#extraParams = `&tid=${this.#teacherId}&tname=${teacherName}`;

            const pageTitleName = $("#pageTitleName");
            pageTitleName.text(`View ${pageTitleName.text()}:`);

            const pageSubTitle = $("#pageSubTitle");
            pageSubTitle.text(teacherName);
            pageSubTitle.css("display", "inline-block");

            $("#myRoadmap").css("display", "inline-block");
            $(".siteCurrentMenuOption").css("display", "none");

            this.#pageData.lastSubject = "";
            this.#pageData.lastGrade = "";
            this.#pageData.lastScope = "all";
        }
        else {
            $("#myRoadmap").css("display", "none");
        }

        /*
        * Initialize selectors
        */
        this.#subjectSelector = $("#subjectSelector");
        this.#gradeSelector = $("#gradeSelector");
        this.#scopeSelector = $("#scopeSelector");

        // Subject selector
        this.#subjectSelector.on("change", () => {
            this.#pageData.lastSubject = this.#subjectSelector.val();
            this.#syncSubjectGrades(this.#pageData.lastGrade);
            this.#queryRoadmap();
            this.#savePageData();
        });

        // Grade selector
        this.#gradeSelector.on("change", () => {
            this.#pageData.lastGrade = this.#gradeSelector.val();
            this.#queryRoadmap();
            this.#savePageData();
        });

        // Scope selector
        this.#scopeSelector.val(this.#pageData.lastScope);
        this.#scopeSelector.on("change", () => {
            this.#pageData.lastScope = this.#scopeSelector.val();
            this.#queryRoadmap();
            this.#savePageData();
        })

        Cpi.ShowAppFrame();

        this.#queryRoadmap(true, (data) => {
            var currentSubject = this.#pageData.lastSubject;
            var currentGrade = this.#pageData.lastGrade;
    
            // Initialize subjects.
            for (const subject of data.meta.subjects) {
                const option = document.createElement("option");
                option.value = option.text = subject.name;
                option.grades = subject.grades;
                this.#subjectSelector.append($(option));
            }
    
            if (!currentSubject || (this.#subjectSelector.val(currentSubject).val() != currentSubject)) {
                currentSubject = this.#subjectSelector.find(":first").val();
            }
            this.#subjectSelector.val(currentSubject);
    
            this.#syncSubjectGrades(currentGrade);
    
            $("#navigationSelectors").css("visibility", "visible");
    
            this.#populateRoadmapTable(data.benchmarks);
        });
    }

    #syncSubjectGrades(currentGrade) {
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

        if (!currentGrade || (this.#gradeSelector.val(currentGrade).val() !== currentGrade)) {
            currentGrade = this.#gradeSelector.find(":first").val();
            this.#pageData.lastGrade = currentGrade;
            this.#gradeSelector.val(currentGrade);
            this.#savePageData();
        }    
    }

    #queryRoadmap(wantMeta, successHandler) {
        var queryUrl = `/@/lesson/roadmap?subject=${this.#pageData.lastSubject}&grade=${this.#pageData.lastGrade}&scope=${this.#pageData.lastScope}`;
        if (wantMeta) {
            queryUrl += "&wantMeta";
        }
        if (this.#teacherId) {
            queryUrl += `&teacherId=${this.#teacherId}`;
        }

        Cpi.SendApiRequest({
            method: "GET",
            url: queryUrl,
            success: (data, status, xhr) => {
                if (successHandler) {
                    successHandler(data);
                }
                else {
                    this.#populateRoadmapTable(data.benchmarks);
                }
            }
        });
    }

    #populateRoadmapTable(benchmarks) {
        this.#roadmapTable.empty();

        for (const benchmark of benchmarks) {
            this.#roadmapTable.appendRow(benchmark, (row, benchmark) => {
                const benchmarkCode = row.find("#benchmarkCode");
                benchmarkCode.text(benchmark.code);
                benchmarkCode.attr("href", benchmark.url);

                const synopsis = row.find("#benchmarkSynopsis");
                synopsis.html(benchmark.synopsis);

                if (benchmark.lessons.length) {
                    synopsis.addClass("benchmarkSynopsis_assigned");

                    const lessonColumn = row.find("#benchmarkLesson");
                    for (const lesson of benchmark.lessons) {
                        const lessonBubble = this.#lessonTemplate.clone(true);
    
                        lessonBubble.find("#lessonName").text(lesson.name);
    
                        lessonBubble.find("#lessonDate").text(Cpi.FormatShortDateString(lesson.date));
    
                        lessonBubble.find("#lessonLink").attr("href", `/lesson?id=${lesson.id}${this.#extraParams}`);
    
                        lessonColumn.append(lessonBubble);
                    }
                }
            });
        }

        this.#roadmapTable.stripeRows();
    }

    #savePageData() {
        if (!this.#teacherId) {
            localStorage.setItem("roadmapData", JSON.stringify(this.#pageData));
        }
    }
}

window.page = new RoadmapPage();0