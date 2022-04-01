import uuid from 'uuid';
import NewInstanceHoldingItem from './holdingsMove/defaultInstanceHoldingItem';

export default {
  createItemWithSameParams: (locationId) => {
    cy.createInstanceType(NewInstanceHoldingItem.defaultUiInstanceType.body);
    cy.getHoldingSources().then(holdingSources => {
      const specialInstance = { ...NewInstanceHoldingItem.defaultUiInstance.body };
      specialInstance.instanceTypeId = NewInstanceHoldingItem.defaultUiInstanceType.body.id;
      cy.createInstance({ instance: specialInstance });
      const specialHolding = { ...NewInstanceHoldingItem.defaultUiHolding.body };
      specialHolding.permanentLocationId = locationId;
      specialHolding.instanceId = specialInstance.id;
      specialHolding.sourceId = holdingSources.holdingsRecordsSources[0].id;
      cy.createHolding({ holding: specialHolding });
      cy.getMaterialTypes().then(materialType => {
        cy.getLoanTypes().then(loanTypes => {
          const specialItem = { ...NewInstanceHoldingItem.defaultUiCreateItem.body };
          specialItem.holdingsRecordId = specialHolding.id;
          specialItem.permanentLoanType.id = loanTypes[0].id;
          specialItem.materialType.id = materialType.id;
          cy.createItem(specialItem);
        });
      });
    });
  },

  deleteItemWithSameParams() {
    cy.okapiRequest({
      method: 'DELETE',
      path: `inventory/items/${uuid()}`,
    });
    cy.okapiRequest({
      method: 'DELETE',
      path: `loan-types/${uuid()}`,
    });
    cy.okapiRequest({
      method: 'DELETE',
      path: `material-types/${uuid()}`,
    });
    cy.okapiRequest({
      method: 'DELETE',
      path: `holdings-storage/holdings/${uuid()}`,
    });
    cy.okapiRequest({
      method: 'DELETE',
      path: `inventory/instances/${uuid()}`,
    });
    cy.okapiRequest({
      method: 'DELETE',
      path: `holdings-sources/${uuid()}`,
    });
    cy.okapiRequest({
      method: 'DELETE',
      path: `instance-types/${uuid()}`,
    });
  },
};
