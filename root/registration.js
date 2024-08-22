

class RegistrationPage extends CpiPage {

    constructor() {
        super();

        const searchParams = new URLSearchParams(window.location.search);
        const invitationId = searchParams.get("id");
        if (!invitationId) {
            window.open("/");
        }

        Cpi.SendApiRequest({
            method: "GET",
            url: `/@/account/invitation/${invitationId}`,
            success: (data) => {
                this.#init(data);
            },
            error: (xhr, status, message) => {
                if (xhr.status === 404) {
                    Cpi.ShowAlert("This registration request is invalid");
                    window.location.href = "/";
                }
            }
        });
    }

    #init(data) {
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
            Cpi.ShowAlert("Missing first name");
            $("#firstName").focus();
            return;
        }

        params.lastName = $("#lastName").val().trim();
        if (!params.lastName.length) {
            Cpi.ShowAlert("Missing last name");
            $("#lastName").focus();
            return;
        }

        params.authCode = $("#password").val().trim();
        if (!params.authCode.length) {
            Cpi.ShowAlert("Missing password");
            $("#password").focus();
            return;
        }

        const confirmAuthCode = $("#confirm").val().trim();
        if (!confirmAuthCode.length) {
            Cpi.ShowAlert("Missing password confirmation");
            $("#confirm").focus();
            return;
        }

        if (params.authCode !== confirmAuthCode) {
            alert("Passwords do not match");
            return;
        }

        Cpi.SendApiRequest({
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
                    Cpi.ShowAlert(message);
                }
            }
        });

    }
}


window.page = new RegistrationPage();