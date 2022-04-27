import moment from 'moment';

import {
  Button,
  NavListItem,
  TextArea,
  TextField,
} from '../../../../interactors';

const createFormat = 'YYYY/MM/DD';
const detailsFormat = 'M/D/YYYY';

export default {
  fillScheduleInfo(data) {
    cy.do([
      TextField({ id: 'input_schedule_name' }).fillIn(data.name),
      TextArea({ name: 'description' }).fillIn(data.description),
    ]);
    data.schedules.forEach((schedule, index) => {
      cy.do([
        TextField({ name: `schedules[${index}].from` }).fillIn(moment(schedule.from).format(createFormat)),
        TextField({ name: `schedules[${index}].to` }).fillIn(moment(schedule.to).format(createFormat)),
        TextField({ name: `schedules[${index}].due` }).fillIn(moment(schedule.due).format(createFormat)),
        // eslint-disable-next-line cypress/no-unnecessary-waiting
        cy.wait(2000),
      ]);
    });
  },
  checkSchedules(schedules) {
    schedules.forEach((schedule) => {
      cy.contains(`${moment(schedule.from).format(detailsFormat)}`).should('be.visible');
      cy.contains(`${moment(schedule.to).format(detailsFormat)}`).should('be.visible');
      cy.contains(`${moment(schedule.due).format(detailsFormat)}`).should('be.visible');
    });
  },
  editSchedule(name, newScheduleData) {
    cy.do([
      NavListItem(name).click(),
      Button({ id: 'clickable-edit-item' }).click(),
    ]);
    this.fillScheduleInfo({ name, ...newScheduleData });
    cy.do(Button({ id: 'clickable-save-fixedDueDateSchedule' }).click());
    this.checkSchedules(newScheduleData.schedules);
  },
};
