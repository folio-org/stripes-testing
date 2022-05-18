import { Section, NavListItem } from '../../../../../interactors';

const rootPaneset = Section({ id:'app-settings-nav-pane' });
const conditionsValues = ['Maximum number of items charged out',
  'Maximum number of lost items',
  'Maximum number of overdue items',
  'Maximum number of overdue recalls',
  'Maximum outstanding fee/fine balance',
  'Recall overdue by maximum number of days'];


export default {
  conditionsValues,
  waitLoading:() => conditionsValues.forEach(conditionValue => cy.expect(rootPaneset.find(NavListItem(conditionValue)).exists())),
  select: (conditionValue = conditionsValues[0]) => {
    cy.do(rootPaneset.find(NavListItem(conditionValue)).click());
  }
};
