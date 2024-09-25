

class TestPage extends CpiPage {
    #datePicker;

    constructor() {
        super();

        this.#datePicker = new DatePicker($("#lessonDate"));

        Cpi.ShowAppFrame();

    }
}


window.page = new TestPage();
