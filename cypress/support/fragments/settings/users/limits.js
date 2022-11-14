import uuid from 'uuid';
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
  setMaximumNumberOfOverdueItems: (itemsNumber) => {
    cy.do([
      TextField({ name:'584fbd4f-6a34-4730-a6ca-73a6a6a9d845' }).fillIn(itemsNumber),
      saveButton.click(),
    ]);
  },
};
