import uuid from 'uuid';

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
  }
};
