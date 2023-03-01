import {
  Accordion,
  Button, CalendarCell, Headline, HTML,
  including,
  Link, MultiColumnList,
  MultiColumnListCell, MultiColumnListHeader,
  MultiColumnListRow, not,
  Pane,
  PaneHeader
} from '../../../../interactors';


export default {
  newButtonExists() {
    cy.do(
      Button('New').exists()
    );
  },
  deleteButtonExists() {
    cy.do(
      Button('Delete').exists()
    );
  },
  editButtonExists() {
    cy.do(
      Button('Edit').exists()
    );
  },
  duplicateButtonExists() {
    cy.do(
      Button('New').exists()
    );
  },
  purgeOldCalendarsButtonExists() {
    cy.do(
      Button('Purge old calendars').exists()
    );
  },
  checkPaneExists(paneHeading) {
    cy.do(
      Pane(paneHeading).exists()
    );
  },
  calendarTable: {
    clickCalendarNameHeader() {
      cy.do(
        MultiColumnListHeader('Calendar name').click(),
      );
    },
    clickStartDateHeader() {
      cy.do(
        MultiColumnListHeader('Start date').click(),
      );
    },
    clickEndDateHeader() {
      cy.do(
        MultiColumnListHeader('End date').click(),
      );
    },
    clickAssignmentsHeader() {
      cy.do(
        MultiColumnListHeader('Assignments').click(),
      );
    },
    clickServicePointHeader() {
      cy.do(
        MultiColumnListHeader('Service point').click(),
      );
    },
    clickCurrentStatusHeader() {
      cy.do(
        MultiColumnListHeader('Current status').click(),
      );
    }
  },
  openCalendarWithServicePoint(servicePoint) {
    cy.do([
      Pane('Calendar').find(Link('Current calendar assignments')).click(),
      Pane('Current calendar assignments').find(MultiColumnListCell(servicePoint, { column: 'Service point' })).click(),
    ]);
  },
  allCalendarsPane: {
    clickPurgeOldCalendarsAction() {
      cy.do(
        Pane('All calendars').clickAction('Purge old calendars'),
      );
    },
    clickNewButton() {
      cy.do([
        Pane('Calendar').find(Link('All calendars')).click(),
        Pane('All calendars').clickAction('New'),
      ]);

      cy.url().should('match', /\/settings\/calendar\/all\/create$/);
    },
    checkActionMenuAbsent() {
      const PaneActionButton = Button({ className: including('actionMenuToggle') });

      cy.do([
        Pane('All calendars').find(PaneActionButton).absent(),
      ]);
    },
    checkActionMenuPresent() {
      const PaneActionButton = Button({ className: including('actionMenuToggle') });

      cy.do([
        Pane('All calendars').find(PaneActionButton).exists(),
      ]);
    },
    openActionMenu() {
      const PaneActionButton = Button({ className: including('actionMenuToggle') });

      cy.do([
        Pane('All calendars').find(PaneActionButton).click()
      ]);
    },
    selectCalendar(calendarName) {
      cy.do([
        Pane('All calendars').find(MultiColumnListCell(calendarName, { column: 'Calendar name' })).click(),
        Pane(calendarName).exists()
      ]);
    },
    checkCalendarExists(calendarName) {
      cy.do([
        Pane('All calendars').find(MultiColumnListCell(calendarName)).exists(),
      ]);
    },
    checkCalendarAbsent(calendarName) {
      cy.do(
        Pane('All calendars').find(MultiColumnListCell(calendarName)).absent()
      );
    },
    openAllCalendarsPane() {
      cy.do(Pane('Calendar').find(Link('All calendars')).click());
    },
    checkNewAndPurgeMenuItemsExist() {
      cy.do([
        Pane('All calendars').find(Button({ className: including('actionMenuToggle') })).click(),
        Button('New').exists(),
        Button('Purge old calendars').exists(),
      ]);
    }
  },
  individualCalendarPane: {
    checkIndividualCalendarPaneExists(calendarName) {
      cy.do([
        Pane(calendarName).exists()
      ]);
    },
    checkActionMenuAbsent(calendarName) {
      const PaneActionButton = Button({ className: including('actionMenuToggle') });

      cy.do([
        Pane(calendarName).find(PaneActionButton).absent()
      ]);
    },
    checkActionMenuPresent(calendarName) {
      const PaneActionButton = Button({ className: including('actionMenuToggle') });

      cy.do([
        Pane(calendarName).find(PaneActionButton).exists()
      ]);
    },
    openActionMenu(calendarName) {
      const PaneActionButton = Button({ className: including('actionMenuToggle') });

      cy.do([
        Pane(calendarName).find(PaneActionButton).click()
      ]);
    },
    close(calendarName) {
      cy.do(
        Pane(calendarName).find(Button({ ariaLabel: 'Close ' + calendarName })).click()
      );
    },
    checkIfOpen247(calendarName) {
      const Paragraph = HTML.extend('paragraph')
        .selector('p')
        .locator((el) => el.textContent);

      cy.do([
        Pane('Calendar').find(Link('All calendars')).click(),
        Pane('All calendars').find(MultiColumnListCell(calendarName)).click(),
      ]);

      const hoursOfOperationAccordion = Pane(calendarName).find(Accordion('Hours of operation'));

      const jobs = [];
      const daysOfTheWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

      daysOfTheWeek.forEach(day => {
        const row = hoursOfOperationAccordion.find(MultiColumnListRow({ content: including(day), isContainer: true }));
        jobs.push(row.exists());
        jobs.push(row.find(MultiColumnListCell({ column: 'Open', innerHTML: '<p title="This calendar is open 24/7 and does not close">–</p>' })).exists());
        jobs.push(row.find(MultiColumnListCell({ column: 'Close', innerHTML: '<p title="This calendar is open 24/7 and does not close">–</p>' })).exists());
      });

      cy.do([
        hoursOfOperationAccordion.find(Paragraph('This calendar is open 24/7 and does not close')).exists(),
        ...jobs
      ]);
    },
    checkOpeningExceptions({ calendarName, addExceptionsOpeningData, addExceptionsOpeningExpectedUIValues }) {
      // check if new opening exception is displayed
      const row = Pane(calendarName)
        .find(Accordion({ label: 'Exceptions — openings' }))
        .find(MultiColumnListRow({ content: including(addExceptionsOpeningData.name), isContainer: true }));

      cy.do(
        row.exists()
      );



      cy.do([
        row.find(
          MultiColumnListCell({
            column: 'Start',
            content: including(addExceptionsOpeningExpectedUIValues.startTime)
          })
        ).exists(),

        row.find(
          MultiColumnListCell({
            column: 'Start',
            content: including(addExceptionsOpeningExpectedUIValues.startTime)
          })
        ).exists(),

        row.find(
          MultiColumnListCell({
            column: 'Close',
            content: including(addExceptionsOpeningExpectedUIValues.endDate)
          })
        ).exists(),

        row.find(
          MultiColumnListCell({
            column: 'Close',
            content: including(addExceptionsOpeningExpectedUIValues.endTime)
          })
        ).exists()
      ]);
    },
    checkHoursOfOperation({ calendarName, addHoursOfOperationExpectedUIValues }) {
      const jobs = [];

      Object.keys(addHoursOfOperationExpectedUIValues).forEach(day => {
        const row = Pane(calendarName)
          .find(Accordion('Hours of operation'))
          .find(MultiColumnListRow({ content: including(day), isContainer: true }));
        jobs.push(
          row.find(MultiColumnListCell({
            column: 'Open',
            content: including(addHoursOfOperationExpectedUIValues[day].startTime)
          }))
            .exists(),
          row.find(MultiColumnListCell({
            column: 'Close',
            content: including(addHoursOfOperationExpectedUIValues[day].endTime)
          }))
            .exists()
        );
      });

      cy.do(jobs);
    },
    selectDuplicateAction({ calendarName }) {
      cy.do(
        Pane(calendarName).clickAction('Duplicate'),
      );
    },
    selectDeleteAction({ calendarName }) {
      cy.do(
        Pane(calendarName).clickAction('Delete'),
      );
    },
    selectEditAction({ calendarName }) {
      cy.do(
        Pane(calendarName).clickAction('Edit'),
      );
      cy.url().should('match', /\/settings\/calendar\/active\/edit\/.+$/g);
    },
    checkDeleteHoursOfOperation({ calendarName, openingHoursData }) {
      cy.do([
        Pane(calendarName).find(Accordion('Hours of operation')).find(MultiColumnListRow({ content: including(openingHoursData.startDay), isContainer: true }))
          .find(MultiColumnListCell({ column: 'Open', content: 'Closed' }))
          .exists(),
        Pane(calendarName).find(Accordion('Hours of operation')).find(MultiColumnListRow({ content: including(openingHoursData.endDay), isContainer: true }))
          .find(MultiColumnListCell({ column: 'Open', content: 'Closed' }))
          .exists(),
      ]);
    },
    checkEditExistingCalendars(editExistingCalendarsData) {
      const daysOfTheWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const hoursOfOperationAccordion = Pane(editExistingCalendarsData.name).find(Accordion('Hours of operation'));

      const jobs = [];

      daysOfTheWeek.forEach(day => {
        const row = hoursOfOperationAccordion.find(MultiColumnListRow({ content: including(day), isContainer: true }));
        jobs.push(row.exists());
        jobs.push(row.find(MultiColumnListCell({ column: 'Open', content: 'Closed' })).exists());
      });

      cy.do(jobs);
    },
    checkEditHoursOfOperation({ calendar, editHoursOfOperationExpectedUIValues }) {
      const hoursOfOperationStartRow = Pane(calendar.name).find(Accordion('Hours of operation')).find(MultiColumnListRow({ content: including(calendar.normalHours[0].startDay), isContainer: true }));
      const jobs = [];

      if (calendar.normalHours[0].startDay === calendar.normalHours[0].endDay) {
        jobs.push(
          hoursOfOperationStartRow.find(MultiColumnListCell({ column: 'Open', content: including(editHoursOfOperationExpectedUIValues.startTime) })).exists(),
          hoursOfOperationStartRow.find(MultiColumnListCell({ column: 'Close', content: including(editHoursOfOperationExpectedUIValues.endTime) })).exists()
        );
      } else {
        const hoursOfOperationEndRow = Pane(calendar.name).find(Accordion('Hours of operation')).find(MultiColumnListRow({ content: including(calendar.normalHours[0].endDay), isContainer: true }));

        jobs.push(
          hoursOfOperationStartRow.find(MultiColumnListCell({ column: 'Open', content: including(editHoursOfOperationExpectedUIValues.startTime) })).exists(),
          hoursOfOperationEndRow.find(MultiColumnListCell({ column: 'Close', content: including(editHoursOfOperationExpectedUIValues.endTime) })).exists()
        );
      }


      cy.do(jobs);
    }
  },
  currentCalendarAssignmentsPane: {
    clickEditAction(calendarName) {
      cy.do([
        Pane(calendarName).clickAction('Edit')
      ]);

      cy.url().should('match', /\/settings\/calendar\/active\/edit\/.+$/g);
    },
    clickNewButton() {
      cy.do(
        PaneHeader('Current calendar assignments').find(Button('New')).click()
      );

      cy.url().should('match', /\/settings\/calendar\/active\/create$/);
    },
    checkNewButtonExists() {
      cy.do([
        PaneHeader('Current calendar assignments').find(Button('New')).exists(),
      ]);
    },
    checkNewButtonAbsent() {
      cy.do([
        PaneHeader('Current calendar assignments').find(Button('New')).absent(),
      ]);
    },
    openCurrentCalendarAssignmentsPane() {
      cy.do(
        Pane('Calendar').find(Link('Current calendar assignments')).click()
      );
    },
    selectCalendarByServicePoint(servicePoint) {
      cy.do(
        Pane('Current calendar assignments').find(MultiColumnListCell(servicePoint, { column: 'Service point' })).click()
      );
    },

    selectCalendarByCalendarName(calendarName) {
      cy.do([
        Pane('Current calendar assignments').find(MultiColumnListCell(calendarName, { column: 'Calendar name' })).click(),
        Pane(calendarName).exists()
      ]);
    },

    checkCalendarWithServicePointExists(servicePoint) {
      cy.do(
        MultiColumnList().find(MultiColumnListCell(servicePoint, { column: 'Service point' })).exists(),
      );
    }
  },
  monthlyCalendarView: {
    selectCalendarByServicePoint(servicePointName) {
      cy.do([
        Pane('Calendar').find(Link('Monthly calendar view')).click(),
        Pane('Monthly calendar view').find(Link(servicePointName)).click()
      ]);
    },

    checkPrevAndNextButtons({ servicePointName }) {
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
        'September', 'October', 'November', 'December'];
      const currentDate = new Date();

      cy.do([
        Pane(servicePointName).find(Headline(including(months[currentDate.getMonth()]))).exists(),
      ]);

      const prevMonth = months[(((currentDate.getMonth() - 1) % 12) + 12) % 12];

      cy.do([
        Pane(servicePointName).find(Button({ ariaLabel: 'arrow-left' })).click(),
        Pane(servicePointName).find(Headline(including(prevMonth))).exists()
      ]);

      cy.do([
        Pane(servicePointName).find(Button({ ariaLabel: 'arrow-right' })).click(),
        Pane(servicePointName).find(Headline(including(months[(currentDate.getMonth())]))).exists()
      ]);

      const nextMonth = months[(((currentDate.getMonth() + 1) % 12) + 12) % 12];

      cy.do([
        Pane(servicePointName).find(Button({ ariaLabel: 'arrow-right' })).click(),
        Pane(servicePointName).find(Headline(including(nextMonth))).exists(),
        Pane(servicePointName).find(Button({ ariaLabel: 'arrow-left' })).click(),
      ]);
    },

    checkCalendarCells({ calendar, monthlyCalendarViewExpectedUIValues }) {
      const days = [
        'sunday',
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday'
      ];


      const [startYear, startMonth, startDay] = calendar.startDate.split('-');
      const startDateObj = new Date(parseInt(startYear, 10), parseInt(startMonth, 10) - 1, parseInt(startDay, 10));
      let dayOfWeekIndex = startDateObj.getUTCDay(); // to keep track of current day of the week
      let currDay = 1; // to keep track of dayLabel property of "CalendarCell"s

      let currDate = `${startYear}-${startMonth}-${('0' + startDay).slice(-2)}`; // to keep track of current date so exceptions can be verified
      const lastDay = parseInt(calendar.endDate.split('-')[2], 10);

      // check adjacent days cells - every adjacent day cell's content must be equal to "Closed"
      cy.do(
        CalendarCell({ inCurrentMonth: false, content: not('Closed') }).absent()
      );


      while (currDay <= lastDay) {
        // if the current date is an exception...
        if (currDate in monthlyCalendarViewExpectedUIValues.exceptions) {
          const content = monthlyCalendarViewExpectedUIValues.exceptions[currDate];
          cy.do(CalendarCell({ dayLabel: currDay.toString(), content }).exists());
        } else {
          cy.do(CalendarCell({ dayLabel: currDay.toString(), content: monthlyCalendarViewExpectedUIValues.days[days[dayOfWeekIndex]] }).exists());
        }

        // update necessary variables
        currDay += 1;
        dayOfWeekIndex = (dayOfWeekIndex + 1) % 7;
        currDate = `${startYear}-${startMonth}-${('0' + currDay.toString()).slice(-2)}`;
      }
    }

  },
};

