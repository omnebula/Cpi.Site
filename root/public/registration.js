

class RegistrationPage {

    constructor() {
        const searchParams = new URLSearchParams(window.location.search);

        if (searchParams.has("test")) {
            return;
        }
        
        const invitationId = searchParams.get("id");
        if (!invitationId) {
            window.open("/");
        }

        Cpi.SendApiRequest({
            method: "GET",
            url: `/@/account/invitation/${invitationId}`,
            success: (data) => {
                this.#init(data);
                Cpi.ShowAppFrame();
            },
            error: (xhr, status, message) => {
                if (xhr.status === 404) {
                    $("#registrationForm").hide();
                    $("#invalidRegistration").show();
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

        $("#registerButton").on("click", (event) => {
            event.stopPropagation();
            event.preventDefault();
            if (!this.#submitRegistration(data.invitationId)) {
                $("#registerButton").prop("disabled", false);
            }
        })
        .prop("disabled", false);
    }

    #submitRegistration(invitationId) {
        $("#registerButton").prop("disabled", true);

        var params = {};

        params.invitationId = invitationId;
        params.authName = $("#username").val();

        params.authCode = $("#password").val().trim();
        if (!params.authCode.length) {
            Cpi.ShowAlert("Missing password");
            $("#password").focus();
            return false;
        }

        const confirmAuthCode = $("#confirm").val().trim();
        if (!confirmAuthCode.length) {
            Cpi.ShowAlert("Missing password confirmation");
            $("#confirm").focus();
            return false;
        }

        if (params.authCode !== confirmAuthCode) {
            Cpi.ShowAlert("Passwords do not match");
            return false;
        }

        Cpi.SendApiRequest({
            method: "POST",
            url: "/@/account/registration",
            data: JSON.stringify(params),
            success: (data) => {
                Cpi.UpdateLoginAccountData(data)
                window.location.href = "/account";
            },
            error: (xhr, status, message) => {
                if (xhr.status === 404) {
                    window.location.href = "/";
                }
                else {
                    Cpi.ShowAlert({
                        message: message,
                        close: () => {
                            $("#registerButton").prop("disabled", false);
                        }
                    });
                }
            }
        });

        return true;

    }
}


window.page = new RegistrationPage();