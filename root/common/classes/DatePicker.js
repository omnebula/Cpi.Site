

class DatePicker {
    #popup;
    #dateInput;

    constructor() {
        this.#popup = $("#datePicker");
        this.#dateInput = new DateInput(this.#popup.find("#dateInput"));
    }

    show(params) {
        if (params.to) {
            if (typeof(params.to) === "string") {
                this.#dateInput.dateVal(Cpi.ParseLocalDate(params.to));
            }
            else {
                this.#dateInput.dateVal(params.to);
            }
        }
        else {
            this.#dateInput.val("");
        }

        if (params.from) {
            this.#dateInput.setExclusions([Cpi.ParseLocalDate(params.from)]);
        }

        this.#popup.find("#popupCaptionTitle").text(params.title);

        Cpi.ShowPopup(this.#popup, () => {
            const end = this.#dateInput.dateVal();
            if (!end || end === "") {
                Cpi.ShowAlert({
                    caption: "Missing Date",
                    message: "Please enter a valid date.",
                    close: () => {
                        this.show(params);
                    }
                })
            }
            else {
                const start = Cpi.ParseLocalDate(params.from);

                var direction;
                if (Cpi.DateDiff(start, end) < 0) { // bump after "from"
                    direction = 1;
                }
                else {  // bump before "from".
                    direction = -1;
                }
    
                var offset = 0;
                var current = new Date(start);
                while (!Cpi.IsDateEqual(current, end)) {
                    offset += direction;
                    current = Cpi.DateAdd(current, direction);
    
                    while (Cpi.IsWeekend(current) || Cpi.IsHoliday(current)) {
                        current = Cpi.DateAdd(current, direction);
                    }
                }
    
                const results = {
                    from: params.from,
                    to: Cpi.FormatIsoDateString(end),
                    offset: offset
                };
                params.accept(results);
            }
        });
    }
}