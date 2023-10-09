import { including } from '@interactors/html';
import {
  Button,
  IconButton,
  TextField,
  Calendar,
  PaneHeader,
  Modal,
  KeyValue,
} from '../../../../../../interactors';
import settingsMenu from '../../../settingsMenu';
import dateTools from '../../../../utils/dateTools';

const currentDate = dateTools.getCurrentDay();
const initialEventName = 'Initial event name';
const editedEventName = 'Edited event name';
const nameAttributeValue = 'periodName';
const currentEventLabel = 'Current:';

const iconsSet = {
  calendar: 'calendar',
  edit: 'edit',
};
const selectors = {
  calendarFirstCell: '.rbc-day-bg:first-child',
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
const fieldLabels = {
  from: 'Valid From:*',
  to: 'Valid To:*',
};

export default {
  openCalendarEvents(servicePointName) {
    cy.visit(settingsMenu.calendarLibraryHoursPath);
    // TODO: Find the approach to use interactors
    cy.get(selectors.servicePoint).contains(servicePointName).scrollIntoView().click();
  },

  createCalendarEvent() {
    cy.do(Button(buttonLabels.new).click());
    cy.expect(PaneHeader(pageHeaders.createEvent).exists());

    cy.do([
      TextField(fieldLabels.from)
        .find(Button({ icon: iconsSet.calendar }))
        .click(),
      Calendar().clickActiveDay(currentDate),
      TextField(fieldLabels.to)
        .find(Button({ icon: iconsSet.calendar }))
        .click(),
      Calendar().clickActiveDay(currentDate),
      TextField({ name: nameAttributeValue }).fillIn(initialEventName),
    ]);

    cy.get(selectors.calendarFirstCell).click();
    cy.do(Button(buttonLabels.saveAndClose).click());
    cy.expect(KeyValue(currentEventLabel, { value: including(initialEventName) }).exists());
  },

  openEditCalendarPage() {
    cy.do(IconButton({ icon: iconsSet.edit }).click());
    cy.expect(PaneHeader(pageHeaders.modifyEvent).exists());
  },

  editCalendarEvent() {
    cy.do([
      TextField({ name: nameAttributeValue }).fillIn(editedEventName),
      Button(buttonLabels.saveAndClose).click(),
    ]);
    cy.expect(KeyValue(currentEventLabel, { value: including(editedEventName) }).exists());
  },

  deleteCalendarEvent() {
    cy.do(IconButton({ icon: iconsSet.edit }).click());
    cy.expect(PaneHeader(pageHeaders.modifyEvent).exists());

    cy.do(Button(buttonLabels.delete).click());
    cy.expect(Modal(pageHeaders.deleteEvent).exists());

    cy.do(Button({ id: 'clickable-delete-confirmation-confirm' }).click());
  },

  checkDeleteButtonAbsence() {
    cy.expect(Button(buttonLabels.delete).absent());
  },

  clearCreatedEvents(servicePointName) {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    this.openCalendarEvents(servicePointName);
    this.deleteCalendarEvent();
  },
};
