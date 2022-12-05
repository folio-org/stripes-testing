import uuid from 'uuid';
import Conditions from './conditions';
import { NavListItem, TextField, Button } from '../../../../../interactors';

const saveButton = Button('Save');

export default {
  createViApi:(patronGroupId, conditionId, value) => {
    return cy.okapiRequest({ method: 'POST',
      path: 'patron-block-limits',
      isDefaultSearchParamsRequired: false,
      body:{
        patronGroupId,
        conditionId,
        value,
        id: uuid()
      } }).then(response => response.body.id);
  },

  selectGroup: (groupName) => {
    cy.do(NavListItem(groupName).click());
  },

  setMaximumNumberOfItemsChargedOut: (itemsNumber) => {
    cy.do([
      TextField({ name:'3d7c52dc-c732-4223-8bf8-e5917801386f' }).fillIn(itemsNumber),
      saveButton.click(),
    ]);
  },
  setMaximumOutstandingFeeFineBalance: (balance) => {
    cy.do([
      TextField({ name:'cf7a0d5f-a327-4ca1-aa9e-dc55ec006b8a' }).fillIn(balance),
      saveButton.click(),
    ]);
  },
  setMaximumNumberOfOverdueItems: (itemsNumber) => {
    cy.do([
      TextField({ name:'584fbd4f-6a34-4730-a6ca-73a6a6a9d845' }).fillIn(itemsNumber),
      saveButton.click(),
    ]);
  },
  setMaximumNumberOfLostItems: (itemsNumber) => {
    cy.do([
      TextField({ name:'72b67965-5b73-4840-bc0b-be8f3f6e047e' }).fillIn(itemsNumber),
      saveButton.click(),
    ]);
  },
  setLimit: (limitName, number) => {
    Conditions.getConditionsViaApi().then(conditions => {
      return conditions.find(condition => condition.name === limitName).id;
    }).then((limitId) => {
      cy.do([
        TextField({ name: limitId }).fillIn(number),
        saveButton.click(),
      ]);
    });
  }
};
