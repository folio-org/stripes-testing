import uuid from 'uuid';
import Conditions from './conditions';
import { NavListItem, TextField, Button } from '../../../../../interactors';

const saveButton = Button('Save');

export default {
  createViaApi: (patronGroupId, conditionId, value) => {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'patron-block-limits',
        isDefaultSearchParamsRequired: false,
        body: {
          patronGroupId,
          conditionId,
          value,
          id: uuid(),
        },
      })
      .then((response) => response.body.id);
  },

  getLimitIdViaApi(limitName) {
    return Conditions.getConditionsViaApi().then(
      (conditions) => conditions.find((condition) => condition.name === limitName).id,
    );
  },

  selectGroup(groupName) {
    cy.do(NavListItem(groupName).click());
  },

  setLimit(limitName, number) {
    this.getLimitIdViaApi(limitName).then((limitId) => {
      cy.do([TextField({ name: limitId }).fillIn(number), saveButton.click()]);
    });
  },

  verifyLimitsCantBeChanged() {
    cy.wrap(Conditions.conditionsValues).each((limitName) => {
      this.getLimitIdViaApi(limitName).then((limitId) => {
        cy.expect(TextField({ name: limitId }).is({ disabled: true }));
      });
    });
    cy.expect(Button('Save').is({ disabled: true }));
  },
};
