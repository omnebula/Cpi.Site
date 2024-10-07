

class LessonApi {
    static PrintLesson(params) {
        const lessons = Array.isArray(params) ? params : [ params ];

        const currentTitle = document.title;

        function setPrint() {
            const openPrint = () => {
                document.title = `${params.name} - ${Cpi.FormatShortDateString(params.date)}`;
            };
            const closePrint = () => {
                document.body.removeChild(this);
                document.title = currentTitle;
            };

            this.contentWindow.initPrintout(lessons);

            this.contentWindow.onbeforeunload = closePrint;
            this.contentWindow.onbeforeprint = openPrint;
            this.contentWindow.onafterprint = closePrint;
            this.contentWindow.print();
        }

        const hideFrame = document.createElement("iframe");
        hideFrame.onload = setPrint;
        hideFrame.style.display = "none"; // hide iframe
        hideFrame.src = "./lesson-printout";
        document.body.appendChild(hideFrame);
    }

    static DeleteLesson(lessonId, success) {
        Cpi.ShowAlert({
            caption: "Confirm Delete",
            message: `Are you sure you want to delete this lesson?`,
            accept: () => {
                Cpi.SendApiRequest({
                    method: "DELETE",
                    url: `/@/lesson/${lessonId}`,
                    success: (data, status, xhr) => {
                        success(data, status, xhr);
                    }
                })
            },
            acceptLabel: "Delete",
            closeLabel: "Cancel",
            maxMessageWidth: "fit-content"
        });
    }
}