import uuid from 'uuid';
import { NavListItem, TextField, Button } from '../../../../../interactors';

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
      Button('Save').click(),
    ]);
  }
};
