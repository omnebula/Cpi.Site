

class BumpPicker {
    #bumpDate;

    constructor() {
        this.#bumpDate = new DatePicker($("#bumpDate"));
    }

    show(params) {
        if (params.to) {
            this.#bumpDate.val(params.to);
        }
        else {
            var target = Cpi.DateAdd(params.from, 1);
            while (Cpi.IsHoliday(target) || Cpi.IsWeekend(target)) {
                target = Cpi.DateAdd(target, 1);
            }
            this.#bumpDate.dateVal(target);
        }

        this.#bumpDate.setExclusions([Cpi.ParseLocalDate(params.from)]);

        Cpi.ShowPopup($("#bumpPicker"), () => {

            const start = Cpi.ParseLocalDate(params.from);
            const end = this.#bumpDate.dateVal();

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
                offset: offset
            };
            params.accept(results);
        });
    }
}