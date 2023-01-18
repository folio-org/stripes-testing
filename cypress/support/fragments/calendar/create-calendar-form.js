import {
  Accordion, Button,
  Calendar, HTML,
  including,
  MultiColumnList, MultiColumnListCell,
  MultiColumnListRow,
  MultiSelect,
  TextField
} from '../../../../interactors';

export default {
  createCalendarWithoutHoursOfOperation(newCalendarInfo, servicePointName) {
    const toggleCalendarButton = HTML.extend('toggle calendar button').selector('button[id^=datepicker-toggle-calendar-button-dp-]');

    cy.do([
      TextField(including('Calendar name')).fillIn(newCalendarInfo.name),
      TextField(including('Start date')).find(toggleCalendarButton()).click(),
      Calendar().clickActiveDay(newCalendarInfo.startDay),
      TextField(including('End date')).find(toggleCalendarButton()).click(),
      Calendar().clickActiveDay(newCalendarInfo.endDay),
      MultiSelect({ label: 'Service points' }).choose(servicePointName),
      Accordion('Hours of operation').find(MultiColumnList()).find(MultiColumnListRow({ index: 0 })).find(MultiColumnListCell({ column: 'Actions' }))
        .find(Button({ ariaLabel: 'trash' }))
        .click(),
      Button('Save and close').click()
    ]);
  }
};
