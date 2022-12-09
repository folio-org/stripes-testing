import uuid from 'uuid';
import Conditions from './conditions';
import { NavListItem, TextField, Button } from '../../../../../interactors';

const saveButton = Button('Save');

export default {
  createViaApi:(patronGroupId, conditionId, value) => {
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
