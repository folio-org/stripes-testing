import { Checkbox, Section, NavListItem, TextArea, Button } from '../../../../../interactors';
import { CONDITION_AND_LIMIT_TYPES } from '../../../constants';
import Condition from './condition';

const rootPaneset = Section({ id: 'app-settings-nav-pane' });
const conditionTypes = Object.values(CONDITION_AND_LIMIT_TYPES);
const messageToBeDisplayed = TextArea({ id: 'message' });

const resetCondition = (conditionValue) => {
  cy.then(() => rootPaneset.find(NavListItem(conditionValue)).href()).then((href) => {
    const conditionId = href.split('/').at(-1);
    Condition.updateViaAPI(conditionId, conditionValue);
  });
};

const defaultConditions = {
  defaultMaximumOustandingFeeFineBalance: {
    // required field
    id: undefined,
    name: 'Maximum outstanding fee/fine balance',
    blockBorrowing: true,
    blockRenewals: true,
    blockRequests: true,
    valueType: 'Double',
    message: 'test message',
  },
};

const updateViaApi = (conditionProperties) => cy.okapiRequest({
  method: 'PUT',
  path: `patron-block-conditions/${conditionProperties.id}`,
  isDefaultSearchParamsRequired: false,
  body: conditionProperties,
});

export default {
  updateViaApi,
  resetConditionViaApi: (conditionId, conditionName) => updateViaApi({
    id: conditionId,
    name: conditionName,
    blockBorrowing: false,
    blockRenewals: false,
    blockRequests: false,
    valueType: 'Double',
    message: '',
  }),
  defaultConditions,
  conditionTypes,
  waitLoading: () => conditionTypes.forEach((conditionValue) => cy.expect(rootPaneset.find(NavListItem(conditionValue)).exists())),
  select: (conditionValue = conditionTypes[0]) => cy.do(rootPaneset.find(NavListItem(conditionValue)).click()),
  resetCondition,
  resetConditions: () => conditionTypes.forEach((conditionValue) => resetCondition(conditionValue)),

  getConditionsViaApi: () => cy
    .okapiRequest({
      path: 'patron-block-conditions',
      isDefaultSearchParamsRequired: false,
    })
    .then((response) => response.body.patronBlockConditions),

  verifyConditionsCantBeChanged: () => {
    cy.expect([
      Checkbox({ id: 'blockBorrowing' }).is({ disabled: true }),
      Checkbox({ id: 'blockRenewals' }).is({ disabled: true }),
      Checkbox({ id: 'blockRequests' }).is({ disabled: true }),
      TextArea({ id: 'message' }).is({ disabled: true }),
      Button('Save').is({ disabled: true }),
    ]);
  },

  setConditionState: (message, blockCheckboxes = [true, true, true]) => {
    cy.get('[class*="partonBlockForm"] input')
      .each((item, index) => {
        cy.get(Cypress.$(item))
          .invoke('is', ':checked')
          .then((checked) => {
            if (!checked && blockCheckboxes[index]) {
              cy.get(Cypress.$(item)).click();
            } else if (checked && !blockCheckboxes[index]) {
              cy.get(Cypress.$(item)).click();
            }
          });
      })
      .then(() => {
        cy.do([messageToBeDisplayed.fillIn(message), Button('Save').click()]);
      });
  },
};
