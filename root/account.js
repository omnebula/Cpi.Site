
class AccountPage extends CpiPage {
    #authCodeChanged;

    constructor() {
        super();

        if (!this.validateLogin()) {
            return;
        }

        Cpi.ShowAppFrame();
        
        Cpi.SendApiRequest({
            method: "GET",
            url: "/@/account/",
            success: (data, status, xhr) => {
                this.#init(data);
            }
        });
    }

    #init(data) {
        $("#firstName").val(data.firstName);
        $("#lastName").val(data.lastName);
        $("#email").val(data.email);

        $("#authCode").on("change", () => {
            this.#authCodeChanged = true;
        });
        this.#initAuthCode();

        $("#editButton").on("click", () => {
            Cpi.EnableEditMode();
        });

        $("#acceptButton").on("click", () => {
            this.#saveAccount();
        });

        $("#cancelButton").on("click", () => {
            Cpi.DisableEditMode();
        });

        Cpi.DisableEditMode();
    }

    #initAuthCode() {
        $("#authCode").val("          ");
        $("#confirmAuthCode").val("**********");
        this.#authCodeChanged = false;
    }

    #enableEditMode() {
        $("#editButton").css("display", "none");
        $("#acceptButton").css("display", "inline-block");
        $("#cancelButton").css("display", "inline-block");

        $(".inputTextBox").each((key, element) => {
            const textBox = $(element);
            textBox.attr("disabled", false);
        });
    }

    #disableEditMode() {
        $(".inputTextBox").each((key, element) => {
            const textBox = $(element);
            textBox.attr("disabled", true);
        });

        $("#acceptButton").css("display", "inline-block");
        $("#cancelButton").css("display", "inline-block");

        $("#editButton").css("display", "inline-block");
        $("#acceptButton").css("display", "none");
        $("#cancelButton").css("display", "none");
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

        Cpi.SendApiRequest({
            method: "PATCH",
            url: "/@/account",
            data: JSON.stringify(params),
            success: (data, status, xhr) => {
                this.#initAuthCode();
                Cpi.DisableEditMode();
            }
        });
    }
}


window.page = new AccountPage();