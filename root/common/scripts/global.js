
class CpiApi {
    sendRequest(params)
    {
        const prevErrorHandler = params.error;
        params.error = (xhr, status, error) => {
            switch (xhr.status) {
                case 401:  // denied
                    CpiApi.doLogin();
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

    static doLogin(onSuccess) {
        const loginPanel = $("#loginPanel");

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
                    localStorage.setItem("accessType", data.accessType);
                    if (onSuccess) {
                        onSuccess(data, status, xhr);
                    }
                    else {
                        window.location.reload();
                    }
                }
            });
        });

        loginPanel.css("display", "flex");
    }
}



class CpiPage
{
    constructor() {
        // Initilize Site Menu
        $("#siteLogout").on("click", () => {
            this.#logout();
        });

        if (localStorage.getItem("accessType") === "organization") {
            $("#siteViewManager").css("display", "inline");
        }

        // insert the login panel at the end of the main section
        const output = $.parseHTML(this.#loginHtml);
        $("main").append(output[1]);
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
    * Utilities
    */
    getTodayDate() {
        const today = new Date();
        today.setHours(0);        
        return today;
    }

    formatDateString(date) {
        return date.toISOString().substring(0, 10);
    }
    formatShortDateString(date) {
        return `${date.getMonth() + 1}/${date.getDate()}`;
    }
    
    parseLocalDate(dateString)
    {
        const utcDate = new Date(dateString);
        return new Date(utcDate.getTime() + (utcDate.getTimezoneOffset() * 60000));
    }
        
    dateDiff(lhs, rhs) {
        const timeDelta = lhs.getTime() - rhs.getTime();
        return Math.round(timeDelta / (1000 * 3600 * 24));
    }
    dateAdd(date, days) {
        const newDate = new Date(date);
        newDate.setDate(newDate.getDate() + days);
        return newDate;
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