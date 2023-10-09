import InventoryHoldings from './holdings/inventoryHoldings';
import NewInstanceHoldingItem from './holdingsMove/defaultInstanceHoldingItem';

export default {
  createItemWithSameParams: (locationId) => {
    cy.createInstanceType(NewInstanceHoldingItem.defaultUiInstanceType.body);
    InventoryHoldings.getHoldingSources({ limit: 1 }).then((holdingSources) => {
      const specialInstance = { ...NewInstanceHoldingItem.defaultUiInstance.body };
      specialInstance.instanceTypeId = NewInstanceHoldingItem.defaultUiInstanceType.body.id;
      cy.createInstance({ instance: specialInstance });
      const specialHolding = { ...NewInstanceHoldingItem.defaultUiHolding.body };
      specialHolding.permanentLocationId = locationId;
      specialHolding.instanceId = specialInstance.id;
      specialHolding.sourceId = holdingSources[0].id;
      cy.createHolding({ holding: specialHolding });
      cy.getMaterialTypes().then((materialType) => {
        cy.getLoanTypes().then((loanTypes) => {
          const specialItem = { ...NewInstanceHoldingItem.defaultUiCreateItem.body };
          specialItem.holdingsRecordId = specialHolding.id;
          specialItem.permanentLoanType.id = loanTypes[0].id;
          specialItem.materialType.id = materialType.id;
          cy.createItem(specialItem);
        });
      });
    });
  },
  // Before using the "delete" method, check that it works!
  deleteItemWithSameParams() {
    cy.okapiRequest({
      method: 'DELETE',
      path: `inventory/items/${NewInstanceHoldingItem.defaultUiCreateItem.body.id}`,
    });
    cy.okapiRequest({
      method: 'DELETE',
      path: `loan-types/${NewInstanceHoldingItem.defaultUiCreateItem.body.permanentLoanType.id}`,
    });
    cy.okapiRequest({
      method: 'DELETE',
      path: `material-types/${NewInstanceHoldingItem.defaultUiCreateItem.body.materialType.id}`,
    });
    cy.okapiRequest({
      method: 'DELETE',
      path: `holdings-storage/holdings/${NewInstanceHoldingItem.defaultUiMaterialTypes.body.id}`,
    });
    cy.okapiRequest({
      method: 'DELETE',
      path: `inventory/instances/${NewInstanceHoldingItem.defaultUiInstance.body.id}`,
    });
    cy.okapiRequest({
      method: 'DELETE',
      path: `holdings-sources/${NewInstanceHoldingItem.defaultUiHoldingsSources.body.id}`,
    });
    cy.okapiRequest({
      method: 'DELETE',
      path: `instance-types/${NewInstanceHoldingItem.defaultUiInstanceType.body.id}`,
    });
  },
};
