

class ConsolePage extends AdminPage {
    #overlayController;

    constructor() {
        super();

        if (!this.validateLogin()) {
            return;
        }

        const overlays = [
            new OrganizationOverlay()
        ];
        this.#overlayController = new OverlayController(overlays, "consoleOverlayName");

        Cpi.ShowAppFrame();
    }
}


class OrganizationOverlay extends TableOverlay {
    #editMode;

    constructor() {
        super({
            overlayName: "Organizations",
            overlayElement: $("#Organizations"),

            entityBroker: new EntityBroker({
                entityName: "organization",
            }),

            entityCaption: "Organization",
            table: $("#organizationTable"),
            deleteButton: $("#deleteOrganization"),
            toggleButtons: [ $("#editOrganization"), $("#sendInvite") ],
            editor: $("#organizationEditor")
        });

        $("#addOrganization").on("click", () => {
            this.#editMode = "add";
            this.editor.find("#insertControls").css("display", "block");
            this.editor.find("#editControls").css("display", "none");

            this.tableController.onAddEntity();
        });

        $("#editOrganization").on("click", () => {
            const row = this.tableController.getSelectedRow();
            if (row) {
                const organizationId = row.attr("id");

                Cpi.SendApiRequest({
                    method: "GET",
                    url: `/@/accounts?access=organization&organization=${organizationId}`,
                    success: (data) => {
                        const principalSelector = this.editor.find("#principalId");
                        principalSelector.empty();
                        for (const current of data) {
                            const option = document.createElement("option");
                            option.value = current.accountId;
                            option.text = `${current.lastName}, ${current.firstName}`;
                            principalSelector.append(option);
                        }

                        this.#editMode = "change";
                        this.editor.find("#insertControls").css("display", "none");
                        this.editor.find("#editControls").css("display", "block");
            
                        this.tableController.onEditEntity();
                    }
                });
            }
        });

        $("#sendInvite").on("click", () => {
            const row = this.tableController.getSelectedRow();
            if (row) {
                const organizationId = row.attr("id");
                const principalId = row.attr("principalId");

                // This is duplicated in AccountOverly. Must refactor.
                const params = {
                    organizationId: organizationId,
                    accountId: principalId
                };
                Cpi.SendApiRequest({
                    method: "POST",
                    url: "/@/account/invitation",
                    data: JSON.stringify(params),
                    success: (data) => {
                        Cpi.ShowAlert(data.registrationUrl);
                    }
                });
            }
        });

    }

    _activateOverlay() {
        super._activateOverlay();
    }

    _formatRow(row, organization) {
        row.attr("id", organization.organizationId);
        row.attr("principalId", organization.principalId);
        row.find("#organizationNameColumn").text(organization.organizationName);
    }

    _compareRows(lhs, rhs) {
        const left = $(lhs).find("#organizationNameColumn").text();
        const right = $(rhs).find("#organizationNameColumn").text();
        return left.localeCompare(right);
    }

    _getEditorData(editor) {
        const data = {
            organizationName: editor.find("#organizationName").val(),
            curriculumCode: editor.find("#organizationCurriculumCode").val()
        }

        const domainName = editor.find("#organizationDomainName").val();
        if (domainName !== "") {
            data.domainName = domainName;
        }

        if (this.#editMode === "add") {
            data.firstName = editor.find("#principalFirstName").val();
            data.lastName = editor.find("#principalLastName").val();
            data.email = editor.find("#principalEmail").val();
        }
        else {
            data.principalId = editor.find("#principalId").val();
        }

        return data;
    }

    _setEditorData(editor, data) {
        if (data) {
            editor.find("#organizationName").val(data.organizationName);
            editor.find("#organizationDomainName").val(data.domainName);
            editor.find("#organizationCurriculumCode").val(data.curriculumCode);
            editor.find("#principalId").val(data.principalId);
        }
        else {
            editor.find("#organizationName").val("");
            editor.find("#principalFirstName").val("");
            editor.find("#principalLastName").val("");
            editor.find("#organizationCurriculumCode").val("");
            editor.find("#principalEmail").val("");
        }
    }
}


window.page = new ConsolePage();