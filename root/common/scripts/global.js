class Cpi {
    static #DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    /*
    * Utilities
    */
    static GetTodayDate() {
        const today = new Date();
        today.setHours(0);        
        today.setMinutes(0);        
        today.setSeconds(0); 
        today.setMilliseconds(0);
        return today;
    }

    static FormatIsoDateString(date) {
        return date ? date.toISOString().substring(0, 10) : "";
    }
    static FormatShortDateString(date, includeDay) {
        if (!date) {
            return "";
        }

        if (typeof date === "string") {
            date = Cpi.ParseLocalDate(date);
        }
        var dateString = date.toLocaleString(undefined, { dateStyle: "medium" });

        if (includeDay) {
            dateString = `${this.#DAY_NAMES[date.getDay()]} ${dateString}`;
        }
        return dateString;
    }

    static ShortDateToIsoString(shortDateString) {
        const date = new Date(shortDateString);
        return Cpi.FormatIsoDateString(date);
    }

    static ParseLocalDate(dateString)
    {
        if (dateString) {
            const utcDate = new Date(dateString);
            return new Date(utcDate.getTime() + (utcDate.getTimezoneOffset() * 60000));
        }
        else {
            return undefined;
        }
    }
        
    static DateDiff(lhs, rhs) {
        const timeDelta = lhs.getTime() - rhs.getTime();
        return Math.round(timeDelta / (1000 * 3600 * 24));
    }

    static DateAdd(date, days) {
        const newDate = new Date(date);
        newDate.setDate(newDate.getDate() + days);
        return newDate;
    }

    static SnapDateToMonday(source) {
        const date = new Date(source);

        // If this is Sunday, select the following Monday (skip forward one day).
        const dayOfWeek = date.getDay()
        if (dayOfWeek === 0) {
            date.setDate(date.getDate() + 1);
        }
        // If this is Saturday, select the following Monday (skip forward 2 days).
        else if (dayOfWeek === 6) {
            date.setDate(date.getDate() + 2);
        }
        // Any day after Monday, select the preceding Monday.
        else if (dayOfWeek > 1) {
            date.setDate(date.getDate() - (dayOfWeek - 1));
        }

        return date;
    }

    static GetCurrentWeekNumber() {
        return Cpi.CalculateWeekNumber(Cpi.SnapDateToMonday(Cpi.GetTodayDate()));
    }

    static GetLastWeekNumber() {
        const calendarEndDate = cpidata.organization.calendar.endDate;
        return calendarEndDate ? Cpi.CalculateWeekNumber(Cpi.ParseLocalDate(calendarEndDate)) : undefined;
    }

    static CalculateWeekNumber(date) {
        if (typeof date === "string") {
            date = Cpi.ParseLocalDate(date);
        }

        const startDate = Cpi.ParseLocalDate(cpidata.organization.calendar.startDate);
        if (!startDate) {
            return undefined;
        }

        const endDate = Cpi.ParseLocalDate(cpidata.organization.calendar.endDate);
        if (!endDate) {
            return undefined;
        }

        if (date < startDate) {
            date = startDate;
        }
        
        if (date > endDate) {
            date = Cpi.DateAdd(endDate, -4); // Snap to the preceding monday.
        }

        date = Cpi.SnapDateToMonday(date);

        const delta = Cpi.DateDiff(date, startDate);
        return (delta / 7) + 1;
    }

    static CalculateWeekStartDate(weekNumber) {
        if (!weekNumber) {
            return undefined;
        }

        const calendarStartDate = Cpi.ParseLocalDate(cpidata.organization.calendar.startDate);
        if (!calendarStartDate) {
            return undefined;
        }

        const weekStartDate = Cpi.DateAdd(calendarStartDate, (weekNumber - 1) * 7);
        return weekStartDate;
    }


    static CalculateWeekDates(weekNumber) {
        const weekStartDate = Cpi.CalculateWeekStartDate(weekNumber);
        return {
            start: weekStartDate,
            end: Cpi.DateAdd(weekStartDate, 4)
        };
    }

    static GetHolidayName(date) {
        if (date) {
            const dateString = Cpi.FormatIsoDateString(date);
            return cpidata.organization.calendar.holidays[dateString];
        }
        else {
            return undefined;
        }
    }
    static IsHoliday(date) {
        return Cpi.GetHolidayName(date) !== undefined;
    }


    static InitAutoDateFormatter(dateElement)
    {
        dateElement.on("blur", () => {
            const string = dateElement.val();
            const date = new Date(string);
            dateElement.val(Cpi.FormatShortDateString(date));
        });
    }


    static SendApiRequest(params)
    {
        if (!params.hideSpinner) {
            Cpi.ShowSpinner();
        }

        const prevSuccessHandler = params.success;
        params.success = (data, status, xhr) => {
            Cpi.HideSpinner();
            if (prevSuccessHandler) {
                prevSuccessHandler(data, status, xhr);
            }
        };

        const prevErrorHandler = params.error;
        params.error = (xhr, status, error) => {
            Cpi.HideSpinner();
            switch (xhr.status) {
                case 401:  // denied
                    Cpi.ShowLogin();
                    break;
                default:
                    if (prevErrorHandler) {
                        prevErrorHandler(xhr, status, error);
                    }
                    else {
                        Cpi.ShowAlert(`${xhr.status} - ${error}`);
                    }
                    break;
            }
        };

        $.ajax(params);
    }


    static ShowSpinner() {
        $(".spinnerFrame").css("display", "flex");
    }
    static HideSpinner() {
        $(".spinnerFrame").css("display", "none");
    }

    static ShowAppFrame() {
        Cpi.HideSpinner();
        $(".appFrame").css("display", "flex");
    }

    static #LoginFrame;
    static ShowLogin(popupParams) {
        popupParams = popupParams || {};

        if (!popupParams.url) {
            popupParams.url = "/@/account/login";
        }
        if (!popupParams.success) {
            popupParams.success = (data, status, xhr) => {
                Cpi.UpdateLoginAccountData(data);
                window.location.reload();
            };
        }
        if (!popupParams.error) {
            popupParams.error = (xhr, status, data) => {
                Cpi.ShowAlert(data);
            }
        }
        if (!popupParams.submit) {
            popupParams.submit = (loginParams) => {
                $.ajax({
                    method: "POST",
                    url: popupParams.url,
                    data: JSON.stringify(loginParams),
                    success: (data, status, xhr) => {
                        popupParams.success(data, status, xhr);
                    },
                    error: (xhr, status, data) => {
                        popupParams.error(xhr, status, data);
                    }
                });
            };
        }

        Cpi.HideSpinner();

        if (!Cpi.#LoginFrame) {
            // Dynamically insert the login panel.
            $("body").append($.parseHTML(Cpi.#LoginHtml)[1]);

            Cpi.#LoginFrame = $("#loginFrame");

            $("#loginForm").on("submit", (event) => {
                event.preventDefault();

                const loginUsername = $("#loginUsername");
                const loginPassword = $("#loginPassword");
            
                const loginParams = {
                    username: loginUsername.val(),
                    password: loginPassword.val()
                };

                loginUsername.val("");
                loginPassword.val("");

                popupParams.submit(loginParams);
            });
        }

        Cpi.#LoginFrame.css("display", "block");
    }
    static HideLogin() {
        if (Cpi.#LoginFrame) {
            Cpi.#LoginFrame.css("display", none);
        }
    }
    static UpdateLoginAccountData(accountData) {
        const currentUser = localStorage.getItem("user");
        if (currentUser && (accountData.email !== currentUser)) {
            localStorage.clear();
        }
        localStorage.setItem("user", accountData.email);
        localStorage.setItem("accountData", JSON.stringify(accountData));
    }

    static ShowAlert(params) {
        var message, caption, close;
        if (typeof params === "string") {
            message = params;
        }
        else {
            message = params.message;
            caption = params.caption;
            close = params.close;
        }

        var alertFrame = $("#alertFrame");
        if (!alertFrame.length) {
            // Dynamically insert the alert panel.
            $("body").append($.parseHTML(Cpi.#AlertHtml)[1]);
            alertFrame = $("#alertFrame");
        }

        alertFrame.find("#alertCaption").html(caption || "Alert");
        alertFrame.find("#alertMessage").html(message);

        alertFrame.find("#popupCancel")
            .val(params.closeLabel || "close")
            .off("click").on("click", () => {
                Cpi.#HideAlert(alertFrame);
                if (close) {
                    close();
                }
            });

        if (params.accept) {
            alertFrame.find("#popupAccept")
                .val(params.acceptLabel || "accept")
                .css("display", "inline-block")
                .off("click").on("click", () => {
                    Cpi.#HideAlert(alertFrame);
                    params.accept();
                });
        }
        else {
            alertFrame.find("#popupAccept").css("display", "none");
        }

        $("body").children(":not(#alertFrame)").css("opacity", "0.5");
        alertFrame.css("display", "flex");
    }
    static #HideAlert(alertFrame) {
        alertFrame.css("display", "none");
        $("body").children(":not(#alertFrame)").css("opacity", "");
    }

    static ShowPopup(popup, accept, cancel) {
        if (typeof popup === "string") {
            popup = $(popup);
        }

        popup.find("#popupAccept").off("click").on("click", () => {
            Cpi.HidePopup(popup);
            if (accept) {
                accept();
            }
        });
        popup.find("#popupCancel").off("click").on("click", () => {
            Cpi.HidePopup(popup);
            if (cancel) {
                cancel();
            }
        });

        popup.css("display", "flex");
        $(".popupFrame").css("display", "block");
        $(".appFrame").css("opacity", "0.5");

        const inputs = popup.find(".popupRow input");
        if (inputs.length) {
            $(inputs[0]).focus();
        }
    }

    static HidePopup(popup) {
        popup.css("display", "none");
        $(".popupFrame").css("display", "none");
        $(".appFrame").css("opacity", "");
    }
    
    static GetSiteTheme() {
        return localStorage.getItem("siteTheme");
    }
    static SetSiteTheme(themeName) {
        localStorage.setItem('siteTheme', themeName);
        document.documentElement.className = themeName;
    }
    static InitSiteTheme() {
        const themeName = Cpi.GetSiteTheme();
        Cpi.SetSiteTheme(themeName || "theme-dark");
    }

    /*
    * File Transfer
    */
    static #FileUploadBox;
    static UploadFile(url, caption, success) {
        if (!Cpi.#FileUploadBox) {
            Cpi.#FileUploadBox = $("#fileUploader");
        }

        if (caption) {
            Cpi.#FileUploadBox.find("#popupCaptionTitle").text(caption);
        }
        else {
            Cpi.#FileUploadBox.find("#popupCaptionTitle").text("File Upload");
        }

        const fileUploadName = Cpi.#FileUploadBox.find("#fileUploadName");
        fileUploadName.val("");

        Cpi.ShowPopup(
            Cpi.#FileUploadBox,
            () => {
                if (fileUploadName.length) {
                    const files = fileUploadName[0].files;

                    if (files.length) {
                        const formData = new FormData();

                        for (const file of files) {
                            formData.append('file', file);
                        }
            
                        Cpi.SendApiRequest({
                            method: "POST",
                            url: url,
                            data: formData,
                            contentType: false,
                            processData: false,
                            success: (data, status, xhr) => {
                                if (success) {
                                    success(data, status, xhr);
                                }
                            }
                        });
                    }
                }
            }
        )
    }

    static DownloadFile(url, filename) {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /*
    * Private Data
    */
    static #AlertHtml = String.raw`
        <div id="alertFrame" class="alertFrame">
            <div id="alertBox" class="alertBox">
                <div class="alertTitle">
                    <div id="alertCaption" class="alertCaption">Alert</div>
                    <div>
                        <input id="popupAccept" class="inputAcceptButton popupCaptionButton" type="button" value="OK"/>
                        <input id="popupCancel" class="inputCancelButton popupCaptionButton" type="button" value="close"/>
                    </div>
                </div>
                <div id="alertMessage" class="alertMessage"></div>
            </div>
        </div>
`;

    static #LoginHtml = String.raw`
    <div id="loginFrame" class="loginFrame">
        <div class="loginBox">
            <div class="loginLogo"><img src="/common/images/logo-graphic.svg" class="loginLogoGraphic"><img src="/common/images/logo-text.svg" class="loginLogoText"></div>
            <form id="loginForm">
                <div class="inputRow">
                    <div class="inputCell">
                        <label class="inputLabel" for="loginUsername">Email</label>
                        <input class="inputTextBox loginUsername" id="loginUsername" name="username" type="text"/>
                    </div>
                </div>
                <div class="inputRow">
                    <div class="inputCell">
                        <label class="inputLabel" for="loginPassword">Password</label>
                        <input class="inputTextBox loginPassword" id="loginPassword" name="password" type="password"/>
                    </div>
                </div>
                <div class="inputRow loginSubmitRow">
                    <input class="inputButton loginSubmit" type="submit" value="Log In"/>
                </div>
            </form>
        </div>
    </div>
`;

}

Cpi.InitSiteTheme();


class CpiPage {
    constructor() {
        if (this.#detectVersionChange()) {
            return;
        }

        // Dynamically insert the spinner panel.
        $("body").append($.parseHTML(this.#spinnerHtml)[1]);
    }

    get accountData() {
        return this.#accountData;
    }
    persistAccountData() {
        localStorage.setItem("accountData", JSON.stringify(this.#accountData));
    }

    isLoggedIn() {
        return window.cpidata && this.#accountData;
    }
    validateLogin() {
        this.#accountData = JSON.parse(localStorage.getItem("accountData"));

        if (this.isLoggedIn()) {
            // Initialize Site Menu
            $("#siteLogout").on("click", () => {
                this.#onLogout();
            });

            if (this.#accountData.accessType !== "system") {

                switch(this.#accountData.accessType) {
                    case "evaluation":
                    case "organization":
                    case "location":
                        $("#siteViewManager").css("display", "inline-block");

                    case "team":
                        $("#siteViewProgress").css("display", "inline-block");
                }

                // Enable/disable teacher menu options.
                const display = this.#accountData.options.classes.length ? "inline-block" : "none";
                $(".siteMenuTeacherOption").css("display", display);

                // Restore last page.
                if (location.pathname !== "/" && location.pathname !== "/login") {
                    localStorage.setItem("lastVisitedPage", location.toString());
                }
            }

            return true;
        }
        else {
            Cpi.ShowLogin();
            return false;
        }
    }

    /*
    * Protected
    */
    get _loginUrl() {
        return "/login";
    }

    /*
    * Private Functions
    */
    
    #onLogout() {
        localStorage.removeItem("accountData");

        Cpi.SendApiRequest({
            method: "POST",
            url: "/@/account/logout",
            success: () => {
                window.location = this._loginUrl;
            }
        });
    }

    /*
    * Versioning (Keep this around until soft-launch).
    */
    #detectVersionChange() {
        const pathname = location.pathname;
        if (pathname) {
            const key = `${pathname.replace(/\//g, "_")}_version`;
            localStorage.removeItem(key);
        }
        return false;
    }

    /*
    * Private Data
    */
    #accountData;

    #spinnerHtml = String.raw`
        <div id="spinnerFrame" class="spinnerFrame">
            <img src="/common/images/spinner.svg" class="spinnerImage" width="240" height="240">
        </div>
`;
}