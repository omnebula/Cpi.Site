

class EditController {
    #editButton;
    #inputElements;
    #viewElements;
    #editElements;

    constructor(settings) {
        this.#editButton = settings.editButton;
        this.#inputElements = settings.inputElements;
        this.#viewElements = settings.viewElements;
        this.#editElements = settings.editElements;

        if (this.#editButton) {
            this.#editButton.on("click", () => {
                this.enableEditMode(true);
            });
        }

        if (settings.acceptButton) {
            settings.acceptButton.on("click", () => {
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
        if (settings.cancelButton) {
            settings.cancelButton.on("click", () => {
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

        if (this.#viewElements) {
            for (const current of this.#viewElements) {
                current.css("display", enable ? "none" : "flex");
            }
        }
        if (this.#editElements) {
            for (const current of this.#editElements) {
                current.css("display", enable ? "flex" : "none");
            }
        }
    }

    acceptChanges() {
    }

    cancelChanges() {
    }
}