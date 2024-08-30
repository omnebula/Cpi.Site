
class AccountPage extends CpiPage {
    #overlayController;

    constructor() {
        super();

        if (!this.validateLogin()) {
            return;
        }

        const overlays = [
            new ProfileOverlay()
        ];
        this.#overlayController = new OverlayController(overlays, "accountOverlayName");

        Cpi.ShowAppFrame();
    }
}


class ProfileOverlay extends OverlayContext {
    #editController;
    #currentData;
    #authCodeChanged;

    constructor() {
        super({
            overlayName: "Profile",
            overlayElement: $("#Profile")
        });

        this.#editController = new EditController({
            parent: this.element,
            inputElements: this.element.find("input[type=text], input[type=password]").not("#email"),
            acceptChanges: () => { this.#acceptChanges(); },
            cancelChanges: () => { this.#cancelChanges(); },
        });
    }

    _activateOverlay() {
        this.#editController.enableEditMode(false);

        Cpi.SendApiRequest({
            method: "GET",
            url: "/@/account/",
            success: (data, status, xhr) => {
                this.#currentData = data;
                this.#setOverlayData(data);
                super._activateOverlay();
            }
        });
    }

    #acceptChanges() {
        const params = {
            firstName: $("#firstName").val(),
            lastName: $("#lastName").val(),
            email: $("#email").val(),
            phone: $("#phone").val()
        };

        if (this.#authCodeChanged) {
            const authCode = $("#authCode").val().trim();
            if (authCode.length > 0) {
                const confirmAuthCode = $("#confirmAuthCode").val();

                if (authCode !== confirmAuthCode) {
                    Cpi.ShowAlert("Passwords do not match");
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
                this.#currentData = data;
                this.#setOverlayData(data);
            }
        });
    }

    #cancelChanges() {
        this.#setOverlayData(this.#currentData);
    }

    #setOverlayData(data) {
        $("#firstName").val(this.#currentData.firstName);
        $("#lastName").val(this.#currentData.lastName);
        $("#email").val(this.#currentData.email);
        $("#phone").val(this.#currentData.phone);

        $("#authCode").on("change", () => {
            this.#authCodeChanged = true;
        });
        this.#initAuthCode();
    }

    #initAuthCode() {
        $("#authCode").val("          ");
        $("#confirmAuthCode").val("**********");
        this.#authCodeChanged = false;
    }
}


window.page = new AccountPage();