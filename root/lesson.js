class LessonPage extends CpiPage {
    #lessonId;
    #benchmarkContainer;
    #benchmarkRowTemplate;
    #benchmarkPicker;
    #detailChanged;

    constructor() {
        super();

        if (!Cpi.ValidateLogin()) {
            return;
        }

        const searchParams = new URLSearchParams(window.location.search);
        Cpi.SendApiRequest({
            method: "GET",
            url: `/@/lesson/${searchParams.get("id")}`,
            success: (data, status, xhr) => {
                this.#init(data);
            }
        });
    }

    #init(data) {
        const searchParams = new URLSearchParams(window.location.search);
        this.#lessonId = searchParams.get("id");

        // Navigation
        if (data.siblings.previous) {
            $("#viewPreviousDay").on("click", () => {
                window.location.href = `/lesson?id=${data.siblings.previous}`;
            })
            .prop("disabled", false);
        }
        if (data.siblings.next) {
            $("#viewNextDay").on("click", () => {
                window.location.href = `/lesson?id=${data.siblings.next}`;
            })
            .prop("disabled", false);
        }
        $("#viewWeek").on("click", () => {
            window.location.href = `/schedule?week=${Cpi.CalculateWeekNumber(Cpi.ParseLocalDate(data.lessonDate))}`;
        });

        // Identity
        const lessonName = $("#lessonName");
        lessonName
            .on("keydown", (event) => {
                if (event.keyCode === 13) {
                    lessonName.blur();
                }
            })
            .on("change", () => {
                lessonName.attr("changed", true);
            })
            .on("blur", () => {
                this.#saveLessonName(lessonName);
            })
            .val(data.lessonName);


        $("#lessonDate").text(data.lessonDate);

        // Benchmark
        this.#benchmarkContainer = $(".lessonBenchmarkContainer");
        this.#benchmarkRowTemplate = $(".lessonBenchmarkRow").detach();
        this.#benchmarkRowTemplate.css("visibility", "visible");
        this.#benchmarkPicker = new BenchmarkPicker();

        $("#lessonAddBenchmarkButton").on("click", () => {
            const exclusions = {};
            $(".lessonBenchmarkRow").each((key, element) => {
                exclusions[element.id] = true;
            });

            this.#benchmarkPicker.show(exclusions, (benchmarks) => {
                this.#sendNewBenchmarks(benchmarks);
            });
        });

        this.#addBenchmarks(data.benchmarks);

        // Details
        if (data.details) {
            const texts = $(".lessonDetailText");
            texts.each((key, element) => {
                const detailName = element.id;

                $(element).on("change", () => {
                    this.#detailChanged = true;
                })
                .on("blur", () => {
                    this.#sendUpdatedDetails();
                })
                .on("keydown", (event) => {
                    if (event.ctrlKey && (event.keyCode === 13)) {
                        this.#sendUpdatedDetails();
                    }
                })
                .val(data.details[detailName]);
            });
        }
    }

    #saveLessonName(lessonName) {
        if (lessonName.attr("changed")) {
            const params = {
                lessonName: lessonName.val()
            };

            Cpi.SendApiRequest({
                method: "PUT",
                url: `/@/lesson/${this.#lessonId}?noecho`,
                data: JSON.stringify(params),
                success: () => {
                    lessonName.attr("changed", false);
                }
            })
        }
    }

    #addBenchmarks(benchmarks) {
        for (const current of benchmarks) {
            const row = this.#benchmarkRowTemplate.clone(true);
            row.attr("id", current.benchmarkId);
            row.find(".lessonBenchmarkSynopsis").html(current.synopsis);
            row.find(".lessonBenchmarkDelete").on("click", () => {
                this.#removeBenchmark(current.benchmarkId);
            });

            const code = row.find(".lessonBenchmarkCode");
            code.on("click", () => {
                window.open(current.referenceUrl, "_blank");
            })
            .text(current.standardCode);

            this.#benchmarkContainer.append(row);
        }
    }

    #sendNewBenchmarks(benchmarks) {
        const params = {
            lessonId: this.#lessonId,
            benchmarks: []
        };

        for (const current of benchmarks) {
            params.benchmarks.push(current.benchmarkId);
        }

        Cpi.SendApiRequest({
            method: "POST",
            url: "/@/lesson/benchmark",
            data: JSON.stringify(params),
            success: (data, status, xhr) => {
                this.#addBenchmarks(benchmarks);
            }
        });
    }

    #removeBenchmark(benchmarkId) {
        const params = {
            lessonId: this.#lessonId,
            benchmarkId: benchmarkId
        };

        Cpi.SendApiRequest({
            method: "DELETE",
            url: "/@/lesson/benchmark",
            data: JSON.stringify(params),
            success: (data, status, xhr) => {
                $(`#${benchmarkId}`).remove();
            }
        });
    }

    #sendUpdatedDetails() {
        if (!this.#detailChanged) {
            return;
        }

        const params = {
            details: {}
        };
        $(".lessonDetailText").each((key, element) => {
            const detailName = element.id;
            params.details[detailName] = $(element).val();
        });

        Cpi.SendApiRequest({
            method: "PUT",
            url: `/@/lesson/${this.#lessonId}?noecho`,
            data: JSON.stringify(params),
            success: (data, status, xhr) => {
                this.#detailChanged = false;
            }
        });
    }

    #seekLesson(lessonId, direction) {
        Cpi.SendApiRequest({
            method: "GET",
            url: `/@/lesson/${lessonId}?seek=${direction}`,
            success: (data) => {
                window.location.href = `/lesson?id=${data.lessonId}`;
            }
        });
    }
}

window.page = new LessonPage();