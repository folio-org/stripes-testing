import uuid from 'uuid';
import NewInstanceHoldingItem from './holdingsMove/defaultInstanceHoldingItem';

const instanceType = { ...NewInstanceHoldingItem.defaultUiInstanceType };
const holdingsSources = { ...NewInstanceHoldingItem.defaultUiHoldingsSources };
const instance = { ...NewInstanceHoldingItem.defaultUiInstance };
const holding = { ...NewInstanceHoldingItem.defaultUiHolding };
const materialTypes = { ...NewInstanceHoldingItem.defaultUiMaterialTypes };
const loanTypes = { ...NewInstanceHoldingItem.defaultUiLoanTypes };
const createItem = { ...NewInstanceHoldingItem.defaultUicreateItem };

export default {
  createItem() {
    this.newInstanceType();
    this.newHoldingsSources();
    this.newInstance();
    this.newHoldings();
    this.newMaterialType();
    this.newLoanType();
    this.newItem();
  },

  deleteItem() {
    this.deleteNewItem();
    this.deleteLoanType();
    this.deleteMaterialType();
    this.deleteHoldings();
    this.deleteInstance();
    this.deleteHoldingsSources();
    this.deleteInstanceType();
  },
  newInstanceType() {
    cy.getInstanceTypes({ method: 'POST', body: instanceType.body })
      .then((resp) => {
        expect(resp.body).property('id');
      });
  },
  newHoldingsSources() {
    cy.getHoldingSources({ method: 'POST', body: holdingsSources.body })
      .then((resp) => {
        expect(resp.body).property('id');
      });
  },
  newInstance() {
    cy.createInstance({ method: 'POST', body: instance.body });
  },
  newHoldings() {
    cy.createHolding({ method: 'POST', body: holding.body })
      .then((resp) => {
        expect(resp.body).property('id');
      });
  },
  newMaterialType() {
    cy.getMaterialTypes({ method: 'POST', body: materialTypes.body })
      .then((resp) => {
        expect(resp.body).property('id');
      });
  },
  newLoanType() {
    cy.getLoanTypes({ method: 'POST', body: loanTypes.body })
      .then((resp) => {
        expect(resp.body).property('id');
      });
  },
  newItem() {
    cy.createItem({ method: 'POST', body: createItem.body })
      .then((resp) => {
        expect(resp.body).property('barcode');
      });
  },
  deleteNewItem() {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `inventory/items/${uuid()}`,
    });
  },
  deleteLoanType() {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `loan-types/${uuid()}`,
    });
  },
  deleteMaterialType() {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `material-types/${uuid()}`,
    });
  },
  deleteHoldings() {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `holdings-storage/holdings/${uuid()}`,
    });
  },
  deleteInstance() {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `inventory/instances/${uuid()}`,
    });
  },
  deleteHoldingsSources() {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `holdings-sources/${uuid()}`,
    });
  },
  deleteInstanceType() {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `instance-types/${uuid()}`,
    });
  },
};
