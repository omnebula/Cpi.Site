

class RoadmapPage extends CpiPage
{
    #roadmapTable;
    #lessonTemplate;
    #subjectSelector;
    #gradeSelector;
    #scopeSelector;

    constructor() {
        super();

        if (!this.validateLogin()) {
            return;
        }

        // Extract the lesson bubble template.
        this.#lessonTemplate = $("#lessonBubble").detach();

        // Initialize the roadmap table
        this.#roadmapTable = new DataTable($("#roadmapTable"));

        /*
        * Initialize selectors
        */
        const subject = localStorage.getItem("lastRoadmapSubject") || "";
        const grade = localStorage.getItem("lastRoadmapGrade") || "";
        const scope = localStorage.getItem("lastRoadmapScope") || "all";
        
        this.#subjectSelector = $("#subjectSelector");
        this.#gradeSelector = $("#gradeSelector");
        this.#scopeSelector = $("#scopeSelector");

        // Subject selector
        this.#subjectSelector.on("change", () => {
            localStorage.setItem("lastRoadmapSubject", this.#subjectSelector.val());
            this.#syncSubjectGrades(localStorage.getItem("lastRoadmapGrade"));
            this.#queryRoadmap();
        });

        // Grade selector
        this.#gradeSelector.on("change", () => {
            localStorage.setItem("lastRoadmapGrade", this.#gradeSelector.val());
            this.#queryRoadmap();
        });

        // Scope selector
        this.#scopeSelector.val(scope);
        this.#scopeSelector.on("change", () => {
            localStorage.setItem("lastRoadmapScope", this.#scopeSelector.val());
            this.#queryRoadmap();
        })

        Cpi.ShowAppFrame();

        Cpi.SendApiRequest({
            method: "GET",
            url: `/@/lesson/roadmap?wantMeta&subject=${subject}&grade=${grade}&scope=${scope}`,
            success: (data, status, xhr) => {
                this.#init(data, subject, grade, scope);
            }
        });
    }

    #init(data, currentSubject, currentGrade, currentScope) {
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
        localStorage.setItem("lastRoadmapSubject", currentSubject);
        this.#subjectSelector.val(currentSubject);

        this.#syncSubjectGrades(currentGrade);

        $("#navigationSelectors").css("visibility", "visible");

        this.#populateRoadmapTable(data.benchmarks);
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
            localStorage.setItem("lastRoadmapGrade", currentGrade);
            this.#gradeSelector.val(currentGrade);
        }    
    }

    #queryRoadmap() {
        const subject = this.#subjectSelector.val();
        const grade = this.#gradeSelector.val();
        const scope = this.#scopeSelector.val();

        Cpi.SendApiRequest({
            method: "GET",
            url: `/@/lesson/roadmap?subject=${subject}&grade=${grade}&scope=${scope}`,
            success: (data, status, xhr) => {
                this.#populateRoadmapTable(data.benchmarks);
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
    
                        lessonBubble.find("#lessonLink").attr("href", `/lesson?id=${lesson.id}`);
    
                        lessonColumn.append(lessonBubble);
                    }
                }
            });
        }

        this.#roadmapTable.stripeRows();
    }
}

window.page = new RoadmapPage();0