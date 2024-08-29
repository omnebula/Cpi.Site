

class EditController {
    #editButton;
    #inputElements;
    #inactiveButtons;
    #activeButtons;

    constructor(settings) {
        const parent = settings.parent || $("main");
        this.#editButton = settings.editButton || parent.find("#enableEdit");
        this.#inputElements = settings.inputElements;
        this.#inactiveButtons = settings.inactiveButtons || parent.find("#editInactiveButtons");
        this.#activeButtons = settings.activeButtons || parent.find("#editActiveButtons");

        if (this.#editButton) {
            this.#editButton.on("click", () => {
                this.enableEditMode(true);
            });
        }

        const acceptButton = settings.acceptButton || parent.find("#acceptChanges");
        if (acceptButton.length) {
            acceptButton.on("click", () => {
                var disableEdit = true;
                if (settings.acceptChanges) {
                    disableEdit = settings.acceptChanges() || true;
                }
                else {
                    disableEdit = this.acceptChanges() || true;
                }
                if (disableEdit) {
                    this.enableEditMode(false);
                }
            });
        }

        const cancelButton = settings.cancelButton || parent.find("#cancelChanges");
        if (cancelButton.length) {
            cancelButton.on("click", () => {
                var disableEdit = true;
                if (settings.cancelChanges) {
                    disableEdit = settings.cancelChanges() || true;
                }
                else {
                    disableEdiot = this.cancelChanges() || true;
                }
                if (disableEdit) {
                    this.enableEditMode(false);
                }
            });
        }
    }

    enableEditMode(enable) {
        if (this.#inputElements) {
            for (const current of this.#inputElements) {
                $(current).prop("disabled", !enable);
            }
        }

        if (this.#inactiveButtons) {
            for (const current of this.#inactiveButtons) {
                $(current).css("display", enable ? "none" : "flex");
            }
        }
        if (this.#activeButtons) {
            for (const current of this.#activeButtons) {
                $(current).css("display", enable ? "flex" : "none");
            }
        }
    }

    acceptChanges() {
    }

    cancelChanges() {
    }
}