

class EntityBroker {
    #entityName;
    #entitySetName;
    #detailUrl;
    #listUrl;
 
    constructor(params) {
        this.#entityName = params.entityName;
        this.#entitySetName = params.entitySetName;
        this.#detailUrl = params.detailUrl || `/@/${this.#entityName}`;
        this.#listUrl = params.listUrl || `/@/${this.#entitySetName}`;
    }

    /*
    * Protected
    */
    fetchEntity(row, success) {
        const id = row.attr("id");
        if (id) {
            Cpi.SendApiRequest({
                method: "GET",
                url: this.#formatDetailUrl(id),
                success: success
            });
        }
    }

    fetchEntitySet(success) {
        Cpi.SendApiRequest({
            method: "GET",
            url: this.#listUrl,
            success: success
        });
    }

    insertEntity(data, success) {
        Cpi.SendApiRequest({
            method: "PUT",
            url: this.#formatDetailUrl(),
            data: JSON.stringify(data),
            success: success
        });
    }

    updateEntity(row, data, success) {
        const id = row.attr("id");
        if (id) {
            Cpi.SendApiRequest({
                method: "PATCH",
                url: this.#formatDetailUrl(id),
                data: JSON.stringify(data),
                success: success
            });
        }
    }

    deleteEntity(row, success) {
        const id = row.attr("id");
        if (id) {
            Cpi.SendApiRequest({
                method: "DELETE",
                url: this.#formatDetailUrl(id),
                success: success
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