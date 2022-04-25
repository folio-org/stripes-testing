import {
  Button,
  NavListItem,
  TextArea,
  TextField,
} from '../../../../interactors';

export default {
  fillScheduleInfo(data) {
    cy.do([
      TextField({ id: 'input_schedule_name' }).fillIn(data.name),
      TextArea({ name: 'description' }).fillIn(data.description),
    ]);
    data.schedules.forEach((schedule, index) => {
      cy.do([
        TextField({ name: `schedules[${index}].from` }).fillIn(schedule.from),
        TextField({ name: `schedules[${index}].to` }).fillIn(schedule.to),
        TextField({ name: `schedules[${index}].due` }).fillIn(schedule.due),
        cy.wait(2000),
      ]);
    });
  },
  editSchedule(name, newScheduleData) {
    cy.do([
      NavListItem(name).click(),
      Button({ id: 'clickable-edit-item' }).click(),
    ]);
    this.fillScheduleInfo({ name, ...newScheduleData });
    cy.do(Button({ id: 'clickable-save-fixedDueDateSchedule' }).click());
  },
};
