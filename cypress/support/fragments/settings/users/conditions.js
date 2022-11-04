import { Section, NavListItem, Checkbox, TextArea, Button } from '../../../../../interactors';
import Condition from './condition';

const rootPaneset = Section({ id:'app-settings-nav-pane' });
const conditionsValues = ['Maximum number of items charged out',
  'Maximum number of lost items',
  'Maximum number of overdue items',
  'Maximum number of overdue recalls',
  'Maximum outstanding fee/fine balance',
  'Recall overdue by maximum number of days'];
const borrowingBox = Checkbox({ id:'blockBorrowing' });
const renewalsBox = Checkbox({ id:'blockRenewals' });
const requestsBox = Checkbox({ id:'blockRequests' });
const messageToBeDisplayed = TextArea({ id:'message' });

const resetCondition = (conditionValue) => {
  cy.then(() => rootPaneset.find(NavListItem(conditionValue)).href()).then(href => {
    const conditionId = href.split('/').at(-1);
    Condition.updateViaAPI(conditionId, conditionValue);
  });
};

const defaultConditions = { defaultMaximumOustandingFeeFineBalance : {
  // required field
  id: undefined,
  'name': 'Maximum outstanding fee/fine balance',
  blockBorrowing: true,
  blockRenewals: true,
  blockRequests: true,
  valueType: 'Double',
  message: 'test message'
} };

const updateViaApi = (conditionProperties) => cy.okapiRequest({
  method: 'PUT',
  path: `patron-block-conditions/${conditionProperties.id}`,
  isDefaultSearchParamsRequired : false,
  body: conditionProperties
});

export default {
  updateViaApi,
  resetConditionViaApi:(conditionId, conditionName) => updateViaApi({
    id: conditionId,
    'name': conditionName,
    blockBorrowing: false,
    blockRenewals: false,
    blockRequests: false,
    valueType: 'Double',
    message: ''
  }),
  defaultConditions,
  conditionsValues,
  waitLoading:() => conditionsValues.forEach(conditionValue => cy.expect(rootPaneset.find(NavListItem(conditionValue)).exists())),
  select: (conditionValue = conditionsValues[0]) => cy.do(rootPaneset.find(NavListItem(conditionValue)).click()),
  resetCondition,
  resetConditions:() => conditionsValues.forEach(conditionValue => resetCondition(conditionValue)),

  getConditionsViaApi: () => cy.okapiRequest({
    path: 'patron-block-conditions',
    isDefaultSearchParamsRequired : false,
  }).then(response => response.body.patronBlockConditions),

  setConditionState: (message, borrowing = true, renewals = true, request = true) => {
    cy.do([
      borrowing && borrowingBox.click(),
      renewals && renewalsBox.click(),
      request && requestsBox.click(),
      messageToBeDisplayed.fillIn(message),
      Button('Save').click(),
    ]);
  }
};
