import moment from 'moment';
import uuid from 'uuid';
import {
  Button,
  Heading,
  KeyValue,
  NavListItem,
  Pane,
  TextArea,
  TextField,
} from '../../../../interactors';
import getRandomPostfix from '../../utils/stringTools';

const createFormat = 'YYYY/MM/DD';
const detailsFormat = 'M/D/YYYY';
const buttonCreateSchedule = Button({ id: 'clickable-create-entry' });
const buttonSaveAndClose = Button('Save & close');
const buttonActions = Button('Actions');
const buttonDelete = Button('Delete');
const buttonSave = Button({ id: 'clickable-save-fixedDueDateSchedule' });
const keyName = 'Fixed due date schedule name';
const keyDescription = 'Description';

export default {
  waitLoading() {
    cy.expect(Heading('Fixed due date schedules').exists());
    cy.wait(1000);
  },

  clickButtonNew() {
    cy.do(buttonCreateSchedule.click());
  },

  clickSaveAndClose() {
    cy.wait(1000);
    cy.do(buttonSaveAndClose.click());
  },

  checkGeneralInfo(generalInfo) {
    cy.expect(KeyValue(keyName, { value: generalInfo.name }).exists());
    cy.expect(KeyValue(keyDescription, { value: generalInfo.description }).exists());
  },

  checkSchedules(schedules) {
    schedules.forEach((schedule) => {
      cy.get('#fixedDueDateSchedule')
        .contains(`${moment(schedule.from).format(detailsFormat)}`)
        .should('be.visible');
      cy.get('#fixedDueDateSchedule')
        .contains(`${moment(schedule.to).format(detailsFormat)}`)
        .should('be.visible');
      cy.get('#fixedDueDateSchedule')
        .contains(`${moment(schedule.due).format(detailsFormat)}`)
        .should('be.visible');
    });
  },

  checkGeneralInfoNotExist(generalInfo) {
    cy.expect(KeyValue(keyName, { value: generalInfo.name }).absent());
    cy.expect(KeyValue(keyDescription, { value: generalInfo.description }).absent());
  },

  clickActionsButton() {
    cy.do(buttonActions.click());
  },

  clickDeleteButton() {
    cy.do(buttonDelete.click());
  },

  confirm() {
    cy.wait(1000);
    cy.do(buttonDelete.click());
  },

  fillScheduleInfo(data) {
    cy.expect(Pane({ id: 'fixed-due-date-schedule-pane' }).exists());
    cy.do([
      TextField({ id: 'input_schedule_name' }).fillIn(data.name),
      TextArea({ name: 'description' }).fillIn(data.description),
    ]);
    data.schedules.forEach((schedule, index) => {
      // without this waiter the new date is saved with an error
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(5000);
      cy.do([
        TextField({ name: `schedules[${index}].from` }).fillIn(
          moment(schedule.from).format(createFormat),
        ),
        TextField({ name: `schedules[${index}].to` }).fillIn(
          moment(schedule.to).format(createFormat),
        ),
        TextField({ name: `schedules[${index}].due` }).fillIn(
          moment(schedule.due).format(createFormat),
        ),
      ]);
    });
  },

  editSchedule(name, newScheduleData) {
    cy.do([NavListItem(name).click(), Button('Actions').click(), Button('Edit').click()]);
    this.fillScheduleInfo({ name, ...newScheduleData });
    cy.do(buttonSave.click());
    this.checkSchedules(newScheduleData.schedules);
  },

  createViaApi: () => {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'fixed-due-date-schedule-storage/fixed-due-date-schedules',
        body: {
          id: uuid(),
          schedules: [{ from: new Date(), to: new Date(), due: new Date() }],
          name: `autotest_schedule_${getRandomPostfix()}`,
        },
      })
      .then((fixedDueDateSchedules) => {
        return fixedDueDateSchedules.body;
      });
  },

  getFixedDueDateSchedulesByNameViaAPI() {
    return cy
      .okapiRequest({
        method: 'GET',
        path: 'fixed-due-date-schedule-storage/fixed-due-date-schedules',
      })
      .then((response) => {
        return response.body.fixedDueDateSchedules;
      });
  },

  deleteFixedDueDateSchedulesByNameViaAPI(name) {
    this.getFixedDueDateSchedulesByNameViaAPI().then((schedules) => {
      const schedule = schedules.find((s) => s.name === name);
      if (schedule !== undefined) {
        this.deleteApi(schedule.id);
      }
    });
  },

  deleteApi(id) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `fixed-due-date-schedule-storage/fixed-due-date-schedules/${id}`,
    });
  },
};
