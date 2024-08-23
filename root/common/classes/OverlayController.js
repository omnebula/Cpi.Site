
class OverlayController {
    #currentOverlayName;
    #overlayContexts = {};

    constructor(contexts) {
        for (const current of contexts) {
            this.addOverlay(current);
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
        localStorage.setItem("organizationOverlayName", this.#currentOverlayName);

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
        this.#overlayElement.css("display", "flex");
    }

    hideOverlay() {
        this.#overlayElement.css("display", "none");
        this._deactivateOverlay();
    }

    /*
    * Protected
    */
    _activateOverlay() {
    }

    _deactivateOverlay() {
    }
}