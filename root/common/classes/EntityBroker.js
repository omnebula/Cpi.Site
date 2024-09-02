

class EntityBroker {
    #entityName;
    #entitySetName;
    #detailUrl;
    #listUrl;
 
    constructor(params) {
        if (params) {
            this.#entityName = params.entityName;
            this.#entitySetName = params.entitySetName || `${params.entityName}s`;
            this.#detailUrl = params.detailUrl || `/@/${this.#entityName}`;
            this.#listUrl = params.listUrl || `/@/${this.#entitySetName}`;

            if (params.fetchEntity) {
                this.fetchEntity = params.fetchEntity;
            }
            if (params.fetchEntitySet) {
                this.fetchEntitySet = params.fetchEntitySet;
            }
            if (params.insertEntity) {
                this.insertEntity = params.insertEntity;
            }
            if (params.updateEntity) {
                this.updateEntity = params.updateEntity;
            }
            if (params.deleteEntity) {
                this.deleteEntity = params.deleteEntity;
            }
        }
    }

    /*
    * Protected
    */
    fetchEntity(row, success, detailUrl) {
        const id = row.attr("id");
        if (id) {
            Cpi.SendApiRequest({
                method: "GET",
                url: detailUrl || this.#formatDetailUrl(id),
                success: success
            });
        }
    }

    fetchEntitySet(success, listUrl) {
        Cpi.SendApiRequest({
            method: "GET",
            url: listUrl || this.#listUrl,
            success: success
        });
    }

    insertEntity(data, success, insertUrl) {
        Cpi.SendApiRequest({
            method: "PUT",
            url: insertUrl || this.#formatDetailUrl(),
            data: JSON.stringify(data),
            success: success
        });
    }

    updateEntity(row, data, success, updateUrl) {
        const id = row.attr("id");
        if (id) {
            Cpi.SendApiRequest({
                method: "PATCH",
                url: updateUrl || this.#formatDetailUrl(id),
                data: JSON.stringify(data),
                success: (result, status, xhr) => {
                    success(row, result);
                }
            });
        }
    }

    deleteEntity(row, success, deleteUrl) {
        const id = row.attr("id");
        if (id) {
            Cpi.ShowAlert({
                caption: "Confirm Delete",
                message: `Are you sure you want to delete this ${this.#entityName}?`,
                accept: () => {
                    Cpi.SendApiRequest({
                        method: "DELETE",
                        url: deleteUrl || this.#formatDetailUrl(id),
                        success: success
                    });
                },
                acceptLabel: "delete",
                closeLabel: "cancel"
            });
        }
    }

    /*
    * Private
    */
    #formatDetailUrl(id) {
        return id ? `${this.#detailUrl}/${id}` : this.#detailUrl;
    }
}