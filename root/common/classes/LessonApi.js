

class LessonApi {
    static PrintLesson(params) {
        const currentTitle = document.title;

        function setPrint() {
            const openPrint = () => {
                document.title = `${params.name} - ${Cpi.FormatShortDateString(params.date)}`;
            };
            const closePrint = () => {
                document.body.removeChild(this);
                document.title = currentTitle;
            };

            this.contentWindow.initPrintout(params);

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
    
}