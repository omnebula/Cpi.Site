
class OverlayController {
    #currentOverlayName;
    #overlayContexts = {};
    #restoreOverlayPropertyName;

    constructor(contexts, restoreOverlayPropertyName) {
        for (const current of contexts) {
            this.addOverlay(current);
        }

        this.#restoreOverlayPropertyName = restoreOverlayPropertyName;

        if (this.#restoreOverlayPropertyName) {
            const lastOverlayName = localStorage.getItem(this.#restoreOverlayPropertyName);
            this.showOverlay(lastOverlayName || contexts[0].name);                
        }
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
        this.#overlayElement = settings.overlayElement;
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