
class AccountPage extends CpiPage {
    #authCodeChanged;

    constructor() {
        super("schedule");

        this.sendApiRequest({
            method: "GET",
            url: "/@/account/",
            success: (data, status, xhr) => {
                this.#init(data);
            }
        })

    }

    #init(data) {
        $("#firstName").val(data.firstName);
        $("#lastName").val(data.lastName);
        $("#email").val(data.email);

        $("#authCode").on("change", () => {
            this.#authCodeChanged = true;
        });
        this.#initAuthCode();

        const editButton = $("#editButton");
        editButton.on("click", () => {
            if (editButton.val() === "Edit") {
                this.#enableEditMode();
            }
            else {
                this.#saveAccount();
            }
        });

        const cancelButton = $("#cancelButton");
        cancelButton.on("click", () => {
            this.#disableEditMode();
        });      
    }

    #initAuthCode() {
        $("#authCode").val("          ");
        $("#confirmAuthCode").val("**********");
        this.#authCodeChanged = false;
    }

    #enableEditMode() {
        $(".inputTextBox").each((key, element) => {
            const textBox = $(element);
            textBox.attr("readonly", false);
        });

        $("#editButton").val("Save") ;
        $("#cancelButton").css("display", "inline");
    }

    #disableEditMode() {
        $(".inputTextBox").each((key, element) => {
            const textBox = $(element);
            textBox.attr("readonly", true);
        });

        $("#editButton").val("Edit") ;
        $("#cancelButton").hide();
    }

    #saveAccount() {
        const params = {
            firstName: $("#firstName").val(),
            lastName: $("#lastName").val(),
            email: $("#email").val()
        };

        if (this.#authCodeChanged) {
            const authCode = $("#authCode").val().trim();
            if (authCode.length > 0) {
                const confirmAuthCode = $("#confirmAuthCode").val();

                if (authCode !== confirmAuthCode) {
                    alert("Passwords do not match");
                    return;
                }
            }

            params["authCode"] = authCode;
        }

        this.sendApiRequest({
            method: "PUT",
            url: "/@/account",
            data: JSON.stringify(params),
            success: (data, status, xhr) => {
                this.#initAuthCode();
                this.#disableEditMode();
            }
        });
    }
}


window.page = new AccountPage();