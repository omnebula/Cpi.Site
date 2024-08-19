class Cpi {
    /*
    * Utilities
    */
    static GetTodayDate() {
        const today = new Date();
        today.setHours(0);        
        return today;
    }

    static FormatDateString(date) {
        return date.toISOString().substring(0, 10);
    }
    static FormatShortDateString(date) {
        if (typeof date === "string") {
            date = Cpi.ParseLocalDate(date);
        }
        return date.toLocaleString(undefined, { dateStyle: "medium" });
        //return `${date.getMonth() + 1}/${date.getDate()}`;
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

    static CalculateWeekDates(weekNumber) {
        if (!weekNumber) {
            return undefined;
        }

        const calendarStartDate = Cpi.ParseLocalDate(cpidata.organization.calendar.startDate);
        if (!calendarStartDate) {
            return undefined;
        }

        const weekStartDate = Cpi.DateAdd(calendarStartDate, (weekNumber - 1) * 7);

        return {
            start: weekStartDate,
            end: Cpi.DateAdd(weekStartDate, 4)
        };
    }

    static IsLoggedIn() {
        return window.cpidata ? true : false;
    }
    static ValidateLogin() {
        if (Cpi.IsLoggedIn()) {
            return true;
        }
        else {
            Cpi.ShowLogin();
            return false;
        }
    }
    static ShowLogin() {
        $("#loginPanel").css("display", "flex");
    }

    static ShowAlert(message) {
        window.alert(message);
    }

    static EnableEditMode() {
        $("#editButton").css("display", "none");
        $("#acceptButton").css("display", "inline-block");
        $("#cancelButton").css("display", "inline-block");

        $(".inputTextBox").each((key, element) => {
            const textBox = $(element);
            textBox.prop("disabled", false);
        });
    }

    static DisableEditMode() {
        $(".inputTextBox").each((key, element) => {
            const textBox = $(element);
            textBox.attr("disabled", true);
        });

        $("#acceptButton").css("display", "inline-block");
        $("#cancelButton").css("display", "inline-block");

        $("#editButton").css("display", "inline-block");
        $("#acceptButton").css("display", "none");
        $("#cancelButton").css("display", "none");
    }
}


class CpiApi {
    sendRequest(params)
    {
        const prevErrorHandler = params.error;
        params.error = (xhr, status, error) => {
            switch (xhr.status) {
                case 401:  // denied
                    Cpi.ShowLogin();
                    break;
                default:
                    if (prevErrorHandler) {
                        prevErrorHandler(xhr, status, error);
                    }
                    else {
                        alert(`${xhr.status} - ${error}`);
                    }
                    break;
            }
        };

        $.ajax(params);
    }
}


class CpiPage
{
    accountData;

    constructor(initParam) {
        // Dynamically insert the login panel.
        const output = $.parseHTML(this.#loginHtml);
        $("body").append(output[1]);

        $("#loginForm").on("submit", (event) => {
            event.preventDefault();
        
            const params = {
                username: $("#loginUsername").val(),
                password: $("#loginPassword").val()
            };
        
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

        // Check if static data was successfully loaded.
        if (!window.cpidata) {
            Cpi.ShowLogin();
        }
        else {
            // Initialize Site Menu
            $("#siteLogout").on("click", () => {
                this.#onLogout();
            });

            this.accountData = JSON.parse(localStorage.getItem("accountData"));

            if (this.accountData && this.accountData.accessType === "organization") {
                $("#siteViewManager").css("display", "inline");
            }

            if (initParam) {
                this.sendApiRequest(initParam);
            }
        }
    }

    initPage() {
    }

    validateLogin() {
        if (window.cpidata) {
            return true;
        }
        else {
            Cpi.ShowLogin();
            return false;
        }
    }

    /*
    * API Request
    */
    sendApiRequest(params)
    {
        const api = new CpiApi();
        api.sendRequest(params);
    }

    /*
    * Popups
    */
    showEditPopup(params) {
        const popup = $(params.popupId).css("display", "flex");

        if (params.popupTitle) {
            popup.find(".popupCaptionTitle").text(params.popupTitle);
        }

        popup.find("#popupAccept")
            .on("click", () => {
                if (params.accept) {
                    if (!params.accept(popup)) {
                        return;
                    }
                }
                popup.hide();
            });
        
        popup.find("#popupCancel")
            .on("click", () => {
                if (params.cancel) {
                    params.cancel(popup);
                }
                popup.hide();
            });

        if (params.show) {
            params.show(popup);
        }
   
    }

    alert(message) {
        window.alert(message);
    }
    confirm(message) {
        return window.confirm(message);
    }

    /*
    * Private
    */
    
    #onLogout() {
        localStorage.removeItem("accountData");

        this.sendApiRequest({
            method: "POST",
            url: "/@/account/logout",
            success: () => {
                Cpi.ShowLogin();
            }
        });
    }

    #siteMenuHtml = String.raw`
        <div>
            <a class="siteMenuOption" id="viewManager" href="/manager">manager</a>
            <span id="customCommands"></span>
            <a class="siteMenuOption" id="viewAccount" href="/account">account</a>
            <a class="lastSiteMenuOption" id="logout" href="">logout</a>
        </div>`;

    #loginHtml = String.raw`
                <div id="loginPanel" class="loginPanel">
                    <div class="loginFrame">
                        <form id="loginForm">
                            <div class="inputRow">
                                <div class="inputCell">
                                    <label class="inputLabel" for="loginUsername">Username</label>
                                    <input class="inputTextBox loginUsername" id="loginUsername" name="username" type="text"/>
                                </div>
                            </div>
                            <div class="inputRow">
                                <div class="inputCell">
                                    <label class="inputLabel" for="loginPassword">Pasword</label>
                                    <input class="inputTextBox loginPassword" id="loginPassword" name="password" type="password"/>
                                </div>
                            </div>
                            <div class="inputRow loginSubmitRow">
                                <input class="inputButton loginSubmit" type="submit" value="Log In"/>
                            </div>
                        </form>
                    </div>
                </div>`;
}