class CalendarPopup {
    #popup;
    #selectedDate;
    #selectedDay;
    #selectedMonth;
    #selectedYear;
    #monthNameDiv;
    #dateInput;

    constructor() {
        // Dynamically insert the calendar popup.
        $("body").append($.parseHTML(CalendarPopup.#PopupHtml)[1]);

        this.#popup = $("#calendarPopup");
        this.#popup.on("pointerdown", (event) => {
            event.preventDefault();
            event.stopPropagation();
        });

        this.#monthNameDiv = this.find("#calPop_monthName");
        this.#monthNameDiv.on("click", (event) => {
            this.#showCalendarDates(Cpi.GetTodayDate());
        });
/*
        .on("pointerdown", (event) => {
            event.preventDefault();
            event.stopPropagation();
        });
*/

        this.find("#calPop_prevMonth").on("click", (event) => {
            if (--this.#selectedMonth < 0) {
                this.#selectedMonth = 11;
                --this.#selectedYear;
            }
            this.#updateCalendarDates();
        });


        this.find("#calPop_nextMonth").on("click", (event) => {
            if (++this.#selectedMonth > 11) {
                this.#selectedMonth = 0;
                ++this.#selectedYear;
            }
            this.#updateCalendarDates();
        });
    }

    find(predicate) {
        return this.#popup.find(predicate);
    }

    show(dateInput, enableHolidays) {
        this.#dateInput = dateInput;

        const date = Cpi.ParseLocalDate(this.#dateInput.val()) || Cpi.GetTodayDate();

        $(document).on("pointerdown", () => {
            this.hide();
        });

        this.#showCalendarDates(date, enableHolidays);
    }
    hide() {
        this.#popup.css("display", "none");
        $(document).off("click");
    }

    #showCalendarDates(date, enableHolidays) {
        this.#selectedDate = date;
        this.#selectedDay = this.#selectedDate.getDate();
        this.#selectedMonth = this.#selectedDate.getMonth();
        this.#selectedYear = this.#selectedDate.getFullYear();

        this.#updateCalendarDates(enableHolidays);

        this.#popup.css("display", "inline-block");
    }
    #updateCalendarDates(enableHolidays) {
        // Set the month name.
        this.find("#calPop_monthName").html(`${Cpi.GetMonthName(this.#selectedMonth)}&nbsp;${this.#selectedYear}`);

        // Initialize the days.
        var rows = [];
        var today = Cpi.GetTodayDate();
        var curDate = new Date(this.#selectedYear, this.#selectedMonth, 1);
        while (true) {
            curDate = Cpi.SnapDateToMonday(curDate);
            if (((curDate.getMonth() > this.#selectedMonth) && (curDate.getFullYear() === this.#selectedYear)) || (curDate.getFullYear() > this.#selectedYear)) {
                break;
            }

            const curRow = $(document.createElement("tr"));
            rows.push(curRow);

            for (var colCount = 0; colCount < 5; ++colCount) {
                const curDay = curDate.getDate();
                const curMonth = curDate.getMonth();
                const curYear = curDate.getFullYear();
                
                const curColumn = $(document.createElement("td"));
                curColumn.attr("id", Cpi.FormatIsoDateString(curDate));
                curRow.append(curColumn);

                if (curMonth === this.#selectedMonth) {
                    curColumn.text(curDay)
                        .attr("title", Cpi.FormatShortDateString(curDate));

                    if (Cpi.IsHoliday(curDate) && !enableHolidays) {
                        curColumn.addClass("calPop_holidayDate");
                    }
                    else {
                        curColumn.addClass("calPop_activeDate")
                            .on("click", (event) => {
                                this.#selectColumn(curColumn);
                            });

                        if (Cpi.IsEqualDate(curDate, today)) {
                            curColumn.addClass("calPop_todayDate");
                        }
                        if (Cpi.IsEqualDate(curDate, this.#selectedDate)) {
                            curColumn.addClass("calPop_selectedDate");
                        }
                    }
                }

                curDate = Cpi.DateAdd(curDate, 1);
            }
        }

        const container = this.find("#calPop_tableBody");
        container.empty();
        container.append(rows);

        // Compute location.
        const inputRect = this.#dateInput[0].getBoundingClientRect();
        const popupWidth = this.#popup.outerWidth();
        const popupLeft = inputRect.left + ((inputRect.width - popupWidth) / 2);

        this.#popup.css("top", inputRect.bottom + 8);
        this.#popup.css("left", popupLeft);
    }

    #selectColumn(column) {
        const id = column.attr("id");
        const date = Cpi.ParseLocalDate(id);
        this.#dateInput.val(Cpi.FormatShortDateString(date)).focus();
        this.hide();
    }

    static #PopupHtml = String.raw`
    <div id="calendarPopup">
        <table cellpadding="0" cellspacing="0">
            <thead>
                <tr>
                    <th><button id="calPop_prevMonth" class="calPop_navButton">&lt;</button></th>
                    <th colspan="3"><div id="calPop_monthName">Sep 2024</div></th>
                    <th><button id="calPop_nextMonth" class="calPop_navButton">&gt;</button></th>
                </tr>
                <tr id="calPop_dayHeader"><th>M</th><th>T</th><th>W</th><th>T</th><th>F</th></tr>
            </thead>
            <tbody id="calPop_tableBody">
            </tbody>
        </table>
    </div>
`;

}


class DatePicker {
    static #CalendarPopup;

    constructor(dateInput, enableHolidays) {
        if (!DatePicker.#CalendarPopup) {
            DatePicker.#CalendarPopup = new CalendarPopup;
        }

        dateInput.on("keydown", (event) => {
            switch (event.keyCode) {
                case 13:
                case 9:
                case 27:
                    DatePicker.#CalendarPopup.hide();
                    break;
                case 40:
                    DatePicker.#CalendarPopup.show(dateInput, enableHolidays);
                    break;
            }
        });

        dateInput.on("click", (event) => {
            DatePicker.#CalendarPopup.show(dateInput, enableHolidays);
        });

        dateInput.on("blur", () => {
            var string = dateInput.val();
            const date = new Date(string);
            string = Cpi.FormatShortDateString(date);
            if (string === "Invalid Date") {
                string = "";
            }
            dateInput.val(string);
        });
    }
}
