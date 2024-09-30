

class LessonApi {
    static PrintLesson(params) {
        function setPrint() {
            const closePrint = () => {
                document.body.removeChild(this);
            };

            this.contentWindow.initPrintout(params);

            this.contentWindow.onbeforeunload = closePrint;
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