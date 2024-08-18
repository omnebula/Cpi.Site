class OrganizationPage extends CpiPage {
    #currentOverlayName;
    #overlayContexts = {};

    constructor() {
        super();
        
        if (!Cpi.IsLoggedIn()) {
            return;
        }

        // Initialize overlay selector handlers.
        const overlayOptions = $(".overlaySelectorOption");
        overlayOptions.on("click", (ev) => {
            this.#showOverlay($(ev.currentTarget).val());
        });

        this.#initSettingsOverlay();
        this.#initCalendarOverlay();
        this.#initStudentsOverlay();
        this.#initTeachersOverlay();
        this.#initClassesOverlay();
        this.#initLocationsOverlay();
        this.#initAdministratorsOverlay();

        // Show initial overlay.
        const lastOverlayName = localStorage.getItem("organizationOverlayName");
        this.#showOverlay(lastOverlayName || $(overlayOptions[0]).val());
    }

    #showOverlay(listName) {
        if (this.#currentOverlayName) {
            $(`input[value="${this.#currentOverlayName}"]`).toggleClass("overlaySelectorOption activeOverlaySelectorOption");
            $(`#${this.#currentOverlayName}`).css("display", "none");

            const context = this.#overlayContexts[this.#currentOverlayName];
            if (context && context.deactivate) {
                context.deactivate();
            }
        }

        this.#currentOverlayName = listName;
        localStorage.setItem("organizationOverlayName", this.#currentOverlayName);

        $(`input[value="${this.#currentOverlayName}"]`).toggleClass("overlaySelectorOption activeOverlaySelectorOption");
        $(`#${this.#currentOverlayName}`).css("display", "flex");

        const context = this.#overlayContexts[this.#currentOverlayName];
        if (context && context.activate) {
            context.activate();
        }
    }

    #getOverlayContext(overlayName) {
        return this.#overlayContexts[overlayName];
    }
    #registerOverlayContext(overlayName, context) {
        this.#overlayContexts[overlayName] = context;
    }

    /*
    * Settings
    */
    #initSettingsOverlay() {
        this.#registerOverlayContext("Settings", {
            activate: () => { this.#activateSettingsOverlay(); },
            deactivate: () => { this.#enableSettingsModal(false); }
         } );

        $("#editSettings").on("click", () => {
            this.#enableSettingsModal(true);
        });
        $("#acceptSettingsChanges").on("click", () => {
            this.#enableSettingsModal(false);
        });
        $("#cancelSettingsChanges").on("click", () => {
            this.#enableSettingsModal(false);
        });

        this.#enableSettingsModal(false);
    }
    #activateSettingsOverlay() {
        this.sendApiRequest({
            method: "GET",
            url: "/@/organization",
            success: (data, status, xhr) => {
                // Initialize property editor
                $("#organizationName").val(data.organizationName);
            }
        });
    }
    #enableSettingsModal(enable) {
        this.#enableEditMode(
            enable,
            ["#organizationName"],
            "#settingsActionCommands",
            "#settingsModalCommands");
    }
    #updateSettings() {
    }

    /*
    * Calendar
    */
    #initCalendarOverlay() {
        this.#registerOverlayContext("Calendar", {
            activate: () => { this.#activateCalendarOverlay(); },
            deactivate: () => { this.#enableCalendarModal(false); },
            holidayTable: new DataTable("#holidayListSection", "#holidayListTable", "#holidayListRow")
        });

        $("#editCalendar").on("click", () => {
            this.#enableCalendarModal(true);
        });
        $("#addCalendar").on("click", () => {
            this.#enableCalendarModal(true);
        });
        $("#acceptCalendarChanges").on("click", () => {
            this.#enableCalendarModal(false);
        });
        $("#cancelCalendarChanges").on("click", () => {
            this.#enableCalendarModal(false);
        });

        this.#enableCalendarModal(false);
    }
    #activateCalendarOverlay() {
        this.sendApiRequest({
            method: "GET",
            url: "@/calendar",
            success: (data, status, xhr) => {
                $("#calendarName").val(data.calendarName);
                $("#calendarStartDate").val(data.startDate);
                $("#calendarEndDate").val(data.endDate);

                const context = this.#getOverlayContext("Calendar");
                const holidayTable = context.holidayTable;

                holidayTable.setRows(
                    data.holidays, 
                    (row, data) => {
                        row.find("#holidayNameColumn").text(data[0]);
                        row.find("#holidayStartDateColumn").text(data[1]);
                        row.find("#holidayEndDateColumn").text(data[2] || data[1]);
                    }
                );
            }
        });

        this.#enableCalendarModal(false);
    }
    #enableCalendarModal(enable) {
        this.#enableEditMode(
            enable,
            ["#calendarName", "#calendarStartDate", "#calendarEndDate"],
            "#calendarActionCommands",
            "#calendarModalCommands");
    }

    /*
    * Students
    */
    #initStudentsOverlay() {
        this.#registerOverlayContext("Students");
    }
    #activateStudentsOverlay() {

    }

    /*
    * Teachers
    */
    #initTeachersOverlay() {
        this.#registerOverlayContext("Teachers");
    }
    #activateTeachersOverlay() {

    }

    /*
    * Classes
    */
    #initClassesOverlay() {
        this.#registerOverlayContext("Classes");
    }
    #activateClassesOverlay() {
    }

    /*
    * Locations
    */
    #initLocationsOverlay() {
        this.#registerOverlayContext("Locations");
    }
    #activateLocationsOverlay() {

    }

    /*
    * Admnistrators
    */
    #initAdministratorsOverlay() {
        this.#registerOverlayContext("Administrators");
    }
    #activateAdministratorsOverlay() {

    }

    /*
    * Utilities
    */
    #enableEditMode(enable, inputElements, actionGroupId, modalGroupId) {
        for (const id of inputElements) {
            $(id).prop("disabled", !enable);
        }

        $(actionGroupId).css("display", enable ? "none" : "flex");
        $(modalGroupId).css("display", enable ? "flex" : "none");
    }
}

window.page = new OrganizationPage();