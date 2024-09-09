
class OverlayController {
    #currentOverlayName;
    #overlayContexts = {};
    #restoreOverlayPropertyName;

    constructor(contexts, restoreOverlayPropertyName, initialOverlayName) {
        for (const current of contexts) {
            this.addOverlay(current);
        }

        this.#restoreOverlayPropertyName = restoreOverlayPropertyName;

        if (!initialOverlayName) {
            if (this.#restoreOverlayPropertyName) {
                initialOverlayName = localStorage.getItem(this.#restoreOverlayPropertyName);
            }
            else {
                initialOverlayName = contexts[0].name;
            }
        }

        this.showOverlay(initialOverlayName);
    }

    get currentOverlayName() {
        return this.#currentOverlayName;
    }

    addOverlay(overlayContext) {
        const option = $("<input/>");
        option.attr("type", "button");
        option.val(overlayContext.name);
        option.addClass("inputButton overlaySelectorOption");
        option.on("click", (ev) => {
            this.showOverlay(overlayContext.name);
        });

        this.#overlayContexts[overlayContext.name] = overlayContext;

        $(".overlaySelector").append(option);
    }

    showOverlay(overlayName) {
        if (this.#currentOverlayName) {
            $(`input[value="${this.#currentOverlayName}"]`).toggleClass("overlaySelectorOption activeOverlaySelectorOption");
            $(`#${this.#currentOverlayName}`).css("display", "none");

            const context = this.#overlayContexts[this.#currentOverlayName];
            if (context) {
                context.hideOverlay();
            }
        }

        this.#currentOverlayName = overlayName;

        if (this.#restoreOverlayPropertyName) {
            localStorage.setItem(this.#restoreOverlayPropertyName, this.#currentOverlayName);
        }

        const context = this.#overlayContexts[this.#currentOverlayName];
        if (context) {
            context.showOverlay();
        }

        $(`input[value="${this.#currentOverlayName}"]`).toggleClass("overlaySelectorOption activeOverlaySelectorOption");
    }
}


class OverlayContext {
    #overlayName;
    #overlayElement;

    constructor(settings) {
        this.#overlayName = settings.overlayName;
        this.#overlayElement = settings.overlayElement || $(`#${this.#overlayName}`);
    }

    get name() {
        return this.#overlayName;
    }
    get element() {
        return this.#overlayElement;
    }

    showOverlay() {
        this._activateOverlay();
    }

    hideOverlay() {
        this._deactivateOverlay();
    }

    /*
    * Protected
    */
    _activateOverlay() {
        this.#overlayElement.css("display", "flex");
    }

    _deactivateOverlay() {
        this.#overlayElement.css("display", "none");
    }
}


class TableOverlay extends OverlayContext {
    #tableController;

    constructor(settings) {
        super(settings);

        this.#tableController = new TableController(settings);
        this.#tableController._formatRow = this._formatRow || this.#tableController._formatRow;
        this.#tableController._compareRows = this._compareRows || this.#tableController._compareRows;
        this.#tableController.refreshRows = this.refreshRows || this.#tableController.refreshRows;
        this.#tableController.insertEntity = this.insertEntity || this.#tableController.insertEntity;
        this.#tableController.updateEntity = this.updateEntity || this.#tableController.updateEntity;
        this.#tableController.deleteEntity = this.deleteEntity || this.#tableController.deleteEntity;
        this.#tableController._getEditorData = this._getEditorData || this.#tableController._getEditorData;
        this.#tableController._setEditorData = this._setEditorData || this.#tableController._setEditorData;
    }

    get tableController() {
        return this.#tableController;
    }

    _activateOverlay() {
        this.#tableController.refreshRows();
        super._activateOverlay();
    }
}


