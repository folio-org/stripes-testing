import {
  Button,
  IconButton,
  TextField,
  Calendar,
  PaneHeader,
  Modal,
} from '../../../../../../interactors';
import settingsMenu from '../../../settingsMenu';

const currentDate = new Date().getDate().toString();
const initialEventName = 'Initial event name';
const editedEventName = 'Edited event name';
const nameAttributeValue = 'periodName';

const iconsSet = {
  calendar: 'calendar',
  edit: 'edit',
};
const selectors = {
  eventInfo: '.new-period',
  calendarFirstCell: '.rbc-day-bg:first-child',
  calendar: `[icon=${iconsSet.calendar}]`,
  servicePoint: '[class^=navListSectionControl] [href^="/settings/calendar/library-hours/"]',
};
const pageHeaders = {
  createEvent: 'New: Regular Library Hours Validity Period',
  modifyEvent: 'Modify: Regular Library Hours Validity Period',
  deleteEvent: 'Delete regular library hours',
};
const buttonLabels = {
  new: 'New',
  saveAndClose: 'Save & close',
  delete: 'Delete',
};
const datePickerOrder = {
  validFrom: 0,
  validTo: 1,
};

export default {
  createCalendarEvent() {
    cy
      .visit(settingsMenu.calendarLibraryHoursPath)
      .get(selectors.servicePoint).first().click()
      .do(Button(buttonLabels.new).click())
      .do(PaneHeader(pageHeaders.createEvent).exists());


    cy.get(selectors.calendar).then(buttons => {
      buttons[datePickerOrder.validFrom].click();

      cy.do(Calendar().clickActiveDay(currentDate));
    });

    cy.get(selectors.calendar).then(buttons => {
      buttons[datePickerOrder.validTo].click();

      cy.do(Calendar().clickActiveDay(currentDate));
    });

    cy
      .do(TextField({ name: nameAttributeValue }).fillIn(initialEventName))
      .get(selectors.calendarFirstCell).click()
      .do(Button(buttonLabels.saveAndClose).click())
      .get(selectors.eventInfo).contains(initialEventName);
  },

  editCalendarEvent() {
    cy
      .do(IconButton({ icon: iconsSet.edit }).click())
      .do(PaneHeader(pageHeaders.modifyEvent).exists())
      .do(TextField({ name: nameAttributeValue }).fillIn(editedEventName))
      .do(Button(buttonLabels.saveAndClose).click())
      .get(selectors.eventInfo)
      .contains(editedEventName);
  },

  deleteCalendarEvent() {
    cy
      .do(IconButton({ icon: iconsSet.edit }).click())
      .do(PaneHeader(pageHeaders.modifyEvent).exists())
      .do(Button(buttonLabels.delete).click())
      .do(Modal(pageHeaders.deleteEvent).exists())
      .do(Button({ id: 'clickable-delete-confirmation-confirm' }).click());
  },
};
