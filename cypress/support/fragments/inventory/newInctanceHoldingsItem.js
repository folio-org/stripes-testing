import uuid from 'uuid';
import NewInstanceHoldingItem from './holdingsMove/defaultInstanceHoldingItem';

export default {
  createItem: () => {
    cy.getInstanceTypes({ method: 'POST', body: NewInstanceHoldingItem.defaultUiInstanceType.body })
      .then((resp) => {
        expect(resp.body).property('id');
      });
    cy.getHoldingSources({ method: 'POST', body: NewInstanceHoldingItem.defaultUiHoldingsSources.body })
      .then((resp) => {
        expect(resp.body).property('id');
      });
    cy.createInstance({ method: 'POST', body: NewInstanceHoldingItem.defaultUiInstance.body });
    cy.createHolding({ method: 'POST', body: NewInstanceHoldingItem.defaultUiHolding.body })
      .then((resp) => {
        expect(resp.body).property('id');
      });
    cy.getMaterialTypes({ method: 'POST', body: NewInstanceHoldingItem.defaultUiMaterialTypes.body })
      .then((resp) => {
        expect(resp.body).property('id');
      });
    cy.getLoanTypes({ method: 'POST', body: NewInstanceHoldingItem.defaultUiLoanTypes.body })
      .then((resp) => {
        expect(resp.body).property('id');
      });
    cy.createItem({ method: 'POST', body: NewInstanceHoldingItem.defaultUiCreateItem.body })
      .then((resp) => {
        expect(resp.body).property('barcode');
      });
  },

  deleteItem() {
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
