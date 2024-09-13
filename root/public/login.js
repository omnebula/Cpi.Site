

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
        else if (this.accountData.accessType === "organization") {
            window.location = "/organization";
        }
        else {
            window.location = `/schedule?week=${Cpi.GetCurrentWeekNumber()}`;
        }
    }
}


window.page = new DefaultPage();