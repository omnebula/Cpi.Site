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
        return `${date.getMonth() + 1}/${date.getDate()}`;
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

    static ValidateLogin() {
        if (window.cpidata) {
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
        $.ajaxSetup({
            cache: true
        });

        // Dynamically insert the login panel to the end of the main section.
        const output = $.parseHTML(this.#loginHtml);
        $("main").append(output[1]);

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
                }
            });
        });

        // Load static content data.
        $.getScript("/@/content/static-data")
            .done((script, status, xhr) => {
                // Initialize Site Menu
                $("#siteLogout").on("click", () => {
                    this.#logout();
                });

                this.accountData = JSON.parse(localStorage.getItem("accountData"));

                if (this.accountData && this.accountData.accessType === "organization") {
                    $("#siteViewManager").css("display", "inline");
                }

                if (typeof initParam === "function") {
                    initParam();
                }
                else {
                    this.sendApiRequest(initParam);
                }
            })
            .fail((xhr, settings, exception) => {
                if (xhr.status == 401) {
                    Cpi.ShowLogin();
                }
                else {
                    alert(exception);
                }
            });
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
    
    #logout() {
        localStorage.removeItem("accountData");

        this.sendApiRequest({
            method: "POST",
            url: "/@/account/logout",
            success: () => {
                window.location.href = "/";
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
                    <div>
                        <form id="loginForm">
                            <div class="inputRow">
                                <div class="inputCell">
                                    <label class="inputLabel" for="loginUsername">Username</label>
                                    <input class="inputTextBox" id="loginUsername" name="username" type="text"/>
                                </div>
                            </div>
                            <div class="inputRow">
                                <div class="inputCell">
                                    <label class="inputLabel" for="loginPassword">Pasword</label>
                                    <input class="inputTextBox" id="loginPassword" name="password" type="password"/>
                                </div>
                            </div>
                            <div>
                                <input class="inputButton" type="submit" value="Log In"/>
                            </div>
                        </form>
                    </div>
                </div>`;
}