

class RegistrationPage extends CpiPage {

    constructor() {
        super({
            method: "GET",
            url: `/@/account/invitation/${invitationId}`,
            success: (data) => {
                this.#init(data);
            },
            error: (xhr, status, message) => {
                if (xhr.status === 404) {
                    this.alert("This registration request is invalid");
                    window.location.href = "/";
                }
            }
        });
    }

    #init(data) {
        const searchParams = new URLSearchParams(window.location.search);
        const invitationId = searchParams.get("id");
        if (!invitationId) {
            window.open("/");
        }

        $("#username").val(data.email);
        $("#firstName").val(data.firstName);
        $("#lastName").val(data.lastName);

        if (!data.firstName) {
            $("#firstName").focus();
        }
        else {
            $("#password").focus();
        }

        $("#registerButton").on("click", () => {
            $("#registerButton").prop("disabled", true);
            this.#submitRegistration(data.invitationId);
        })
        .prop("disabled", false);
    }

    #submitRegistration(invitationId) {
        var params = {};

        params.invitationId = invitationId;

        params.firstName = $("#firstName").val().trim();
        if (!params.firstName.length) {
            this.alert("Missing first name");
            $("#firstName").focus();
            return;
        }

        params.lastName = $("#lastName").val().trim();
        if (!params.lastName.length) {
            this.alert("Missing last name");
            $("#lastName").focus();
            return;
        }

        params.authCode = $("#password").val().trim();
        if (!params.authCode.length) {
            this.alert("Missing password");
            $("#password").focus();
            return;
        }

        const confirmAuthCode = $("#confirm").val().trim();
        if (!confirmAuthCode.length) {
            this.alert("Missing password confirmation");
            $("#confirm").focus();
            return;
        }

        if (params.authCode !== confirmAuthCode) {
            alert("Passwords do not match");
            return;
        }

        this.sendApiRequest({
            method: "POST",
            url: "/@/account/registration",
            data: JSON.stringify(params),
            success: (data) => {
                window.location.href = "/";
            },
            error: (xhr, status, message) => {
                if (xhr.status === 404) {
                    window.location.href = "/";
                }
                else {
                    this.alert(message);
                }
            }
        });

    }
}


window.page = new RegistrationPage();