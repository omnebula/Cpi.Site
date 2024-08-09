
class ManagerPage extends CpiPage {
    #accountRowContainer;
    #accountRowTemplate;

    constructor() {
        super({
            method: "GET",
            url: "/@/organization?includeAccounts",
            success: (data, status, xhr) => {
                this.#init(data);
            }
        });
    }

    #init(data) {
        /*
        * Calendar Management
        */
        $("#newCalendar").on("click", () => {

        });
        $("#editCalendar").on("click", () => {

        });

        /*
        * Account Management
        */
        $("#addAccount").on("click", () => {
            this.#openAccountEditor();
        });

        this.#accountRowContainer = $("#accountRowContainer");
        this.#accountRowTemplate = $("#accountRow").detach();

        $("#organizationName").val(data.organizationName);

        $("#calendarName").val(data.calendarName);
        $("#calendarStartDate").val(data.calendarStartDate);
        $("#calendarEndDate").val(data.calendarEndDate);


        if (data.accounts) {
            this.#populateAccountList(data.accounts);
        }
    }

    #populateAccountList(accounts) {
        this.#accountRowContainer.children().remove();

        for (const current of accounts) {
            this.#insertAccountRow(current, false);
        }
    }

    #insertAccountRow(data, sort) {
        const row = this.#accountRowTemplate.clone(true);

        row.attr("id", data.accountId);

        this.#setAccountRowText(row, data);

        this.#accountRowContainer.append(row);

        if (sort) {
            this.#sortAccountRows();
        }
    }

    #setAccountRowText(row, data) {
        row.find(".accountEmailColumn").text(data.email);
        row.find(".accountAccessColumn").text(data.accessType);
        row.find(".accountStatusColumn").text(data.statusType);

        row.find("#sendInvite").off("click").on("click", () => {
            this.#sendInvite(data);
        });
        row.find("#editAccount").off("click").on("click", () => {
            this.#openAccountEditor(data);
        });
        row.find("#deleteAccount").off("click").on("click", () => {
            this.#deleteAccount(data);
        });
    }

    #sortAccountRows() {
        this.#accountRowContainer.children().sort((lhs, rhs) => {
            const lhsEmail = $(lhs).find(".accountEmailColumn").text();
            const rhsEmail = $(rhs).find(".accountEmailColumn").text();
            return lhsEmail < rhsEmail ? -1 : (lhsEmail === rhsEmail ? 0 : 1);
        }).appendTo(this.#accountRowContainer);
    }

    #openAccountEditor(data) {
        const editMode = data != undefined;

        var popupTitle, apiMethod;
        if (editMode) {
            popupTitle = "Edit Account";
            apiMethod = "PUT";
        }
        else {
            popupTitle = "Create Account";
            apiMethod = "POST";
        }

        this.showEditPopup({
            popupId: "#accountEditorPanel",
            popupTitle: popupTitle,
            show: (editor) => {
                const email = editor.find("#email");
                if (data) {
                    email.val(data.email);
                    editor.find("#accessType").val(data.accessType);
                    editor.find("#statusType").val(data.statusType);
                }
                else {
                    editor.find("#email").val("");
                    editor.find("#accessType option:first").prop("selected", true);
                    editor.find("#statusType option:first").prop("selected", true);
                }

                editor.find(".accountParam").on("keydown", (event) => {
                    if (event.keyCode === 13) {
                        $("#popupAccept").click();
                    }
                });

                email.focus();
            },
            accept: (editor) => {
                const params = {};
                editor.find(".accountParam").each((key, element) => {
                    const input = $(element);
                    const name = input.attr("id");
                    const value = input.val().trim();
                    params[name] = value;
                });

                if (!params.email) {
                    this.alert("Missing email");
                    return false;
                }

                var url = "/@/account";
                if (editMode) {
                    url += `/${data.accountId}`;
                }

                this.sendApiRequest({
                    method: apiMethod,
                    url: url,
                    data: JSON.stringify(params),
                    success: (data, status, xhr) => {
                        if (editMode) {
                            const row = this.#accountRowContainer.find(`#${data.accountId}`);
                            this.#setAccountRowText(row, data);
                            this.#sortAccountRows()
                            editor.hide();
                        }
                        else{
                            this.#insertAccountRow(data, true);
                            editor.hide();

                            if (data.invitationId) {
                                this.#showInvitation(data.invitation);
                            }
                        }
                    }
                });

                return false;
            }
        });
    }

    #deleteAccount(data) {
        if (!this.confirm("Are you sure you want to delete this account?")) {
            return;
        }

        this.sendApiRequest({
            method: "DELETE",
            url: `/@/account/${data.accountId}`,
            success: () => {
                $(`#${data.accountId}`).remove();
            }
        })
    }

    #sendInvite(data) {
        const params = {
            accountId: data.accountId
        };

        this.sendApiRequest({
            method: "POST",
            url: "/@/account/invitation",
            data: JSON.stringify(params),
            success: (data) => {
                this.#showInvitation(data.invitationId);
            }
        })
    }

    #showInvitation(invitationId) {
        const invitationUrl = `${window.location.origin}/registration?id=${invitationId}`;
        this.alert(invitationUrl);
    }
}

window.page = new ManagerPage();