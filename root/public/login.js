

class DefaultPage extends CpiPage {
    constructor() {
        super();

        if (!this.validateLogin()) {
            return;
        }

        const lastVisitedPage = localStorage.getItem("lastVisitedPage");
        if (lastVisitedPage) {
            window.location = lastVisitedPage;
        }
        else {
            window.location = "/account";
        }
    }
}


window.page = new DefaultPage();