
class ManagerPage extends CpiPage {
    constructor() {
        super();

        // Hack to remove the manager command since this is the manager page.
        $("#managerCommands").remove();

        this.sendApiRequest({
            method: "GET",
            url: "/@/organization",
            success: (data, status, xhr) => {
                this.#init(data);
            }
        })
    }

    #init(data) {
        $("#organizationName").val(data.organizationName);
    }
}

window.page = new ManagerPage();