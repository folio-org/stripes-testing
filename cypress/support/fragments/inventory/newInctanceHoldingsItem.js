import uuid from 'uuid';
import NewInstanceHoldingItem from './holdingsMove/defaultInstanceHoldingItem';

const instanceType = NewInstanceHoldingItem.defaultUiInstanceType;
const holdingsSources = NewInstanceHoldingItem.defaultUiHoldingsSources;
const instance = NewInstanceHoldingItem.defaultUiInstance;
const holding = NewInstanceHoldingItem.defaultUiHolding;
const materialTypes = NewInstanceHoldingItem.defaultUiMaterialTypes;
const loanTypes = NewInstanceHoldingItem.defaultUiLoanTypes;
const createItem = NewInstanceHoldingItem.defaultUicreateItem;

export default {
  createItem: () => {
    cy.getInstanceTypes({ method: 'POST', body: instanceType.body })
      .then((resp) => {
        expect(resp.body).property('id');
      });
    cy.getHoldingSources({ method: 'POST', body: holdingsSources.body })
      .then((resp) => {
        expect(resp.body).property('id');
      });
    cy.createInstance({ method: 'POST', body: instance.body });
    cy.createHolding({ method: 'POST', body: holding.body })
      .then((resp) => {
        expect(resp.body).property('id');
      });
    cy.getMaterialTypes({ method: 'POST', body: materialTypes.body })
      .then((resp) => {
        expect(resp.body).property('id');
      });
    cy.getLoanTypes({ method: 'POST', body: loanTypes.body })
      .then((resp) => {
        expect(resp.body).property('id');
      });
    cy.createItem({ method: 'POST', body: createItem.body })
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
