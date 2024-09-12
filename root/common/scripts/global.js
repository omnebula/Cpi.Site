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
        return date.toISOString().substring(0, 10);
    }
    static FormatShortDateString(date, includeDay) {
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

    static ShowLogin() {
        Cpi.HideSpinner();
        $("#loginFrame").css("display", "block");
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
            $("body").append($.parseHTML(Cpi.#alertHtml)[1]);
            alertFrame = $("#alertFrame");
        }

        alertFrame.find("#alertCaption").html(caption);
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

        popup.css("display", "flex");
        $(".popupFrame").css("display", "block");
        $(".appFrame").css("opacity", "0.5");

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

        Cpi.ShowPopup(
            Cpi.#FileUploadBox,
            () => {
                const fileUploadName = Cpi.#FileUploadBox.find("#fileUploadName");

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

    static #alertHtml = String.raw`
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
}

Cpi.InitSiteTheme();


class CpiPage {
    constructor() {
        if (this.#detectVersionChange()) {
            return;
        }

        // Dynamically insert the spinner panel.
        $("body").append($.parseHTML(this.#spinnerHtml)[1]);

        // Dynamically insert the login panel.
        $("body").append($.parseHTML(this.#loginHtml)[1]);

        $("#loginForm").on("submit", (event) => {
            event.preventDefault();

            const loginUsername = $("#loginUsername");
            const loginPassword = $("#loginPassword");
        
            const params = {
                username: loginUsername.val(),
                password: loginPassword.val()
            };

            loginUsername.val("");
            loginPassword.val("");
        
            $.ajax({
                method: "POST",
                url: "/@/account/login",
                data: JSON.stringify(params),
                success: (data, status, xhr) => {
                    localStorage.setItem("accountData", JSON.stringify(data));
                    window.location.reload();
                },
                error: (xhr, status, data) => {
                    Cpi.ShowAlert(data);
                }
            });
        });

        this.#accountData = JSON.parse(localStorage.getItem("accountData"));

        if (this.isLoggedIn()) {
            // Initialize Site Menu
            $("#siteLogout").on("click", () => {
                this.#onLogout();
            });

            if (this.#accountData) {
                switch(this.#accountData.accessType) {
                    case "organization":
                    case "location":
                        $("#siteViewManager").css("display", "inline-block");

                    case "team":
                        $("#siteViewProgress").css("display", "inline-block");
                }

                // Enable/disable teacher menu options.
                const display = this.#accountData.classes.length ? "inline-block" : "none";
                $(".siteMenuTeacherOption").css("display", display);
            }
        }
    }

    get accountData() {
        return this.#accountData;
    }

    isLoggedIn() {
        return window.cpidata && this.#accountData;
    }
    validateLogin() {
        if (this.isLoggedIn()) {
            if (location.pathname !== "/" && location.pathname !== "/login") {
                localStorage.setItem("lastVisitedPage", location.toString());
            }
            return true;
        }
        else {
            Cpi.ShowLogin();
            return false;
        }
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
                window.location = "/login";
            }
        });
    }

    /*
    * Versioning
    */
    #detectVersionChange() {
        const pathname = location.pathname;
        if (pathname) {
            const key = `${pathname.replace(/\//g, "_")}_version`;

            // Detect version change.
            const currentVersion = localStorage.getItem(key);

            // If no currentVersion, this is initial run...
            if (!currentVersion) {
                // ... just set the version.
                localStorage.setItem(key, this.#siteVersion);
            } 
            // Otherwise, compare with value in local storage.
            else if (currentVersion !== this.#siteVersion) {
                localStorage.setItem(key, this.#siteVersion);
                location.reload(true);
                return true;
            }
        }

        return false;
    }

    /*
    * Private Data
    */
    #accountData;

    #siteVersion = "0.0.1";

    #spinnerHtml = String.raw`
        <div id="spinnerFrame" class="spinnerFrame">
            <img src="/common/images/spinner.svg" class="spinnerImage" width="240" height="240">
        </div>
`;

    #loginHtml = String.raw`
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