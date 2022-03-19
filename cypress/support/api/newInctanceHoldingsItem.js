import uuid from 'uuid';
import getRandomPostfix from '../utils/stringTools';
import NewServicePoint from './newServicePoint';

export default {

  instanceTypeId:uuid(),
  holdingsSourcesId:uuid(),
  instanceId:uuid(),
  holdingsId:uuid(),
  materialTypeId:uuid(),
  loanTypeId:uuid(),
  itemId:uuid(),
  itemBarcode:`2134456_${getRandomPostfix()}`,


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
    return cy.okapiRequest({
      method: 'POST',
      path: 'instance-types',
      body: {
        code: `autotest_code_${getRandomPostfix()}`,
        id: this.instanceTypeId,
        name: `autotest_name_${getRandomPostfix()}`,
        source: 'local',
      }
    })
      .then((resp) => {
        expect(resp.body).property('id');
      });
  },
  newHoldingsSources() {
    return cy.okapiRequest({
      method: 'POST',
      path: 'holdings-sources',
      body: {
        id: this.holdingsSourcesId,
        name: `autotest_title_${getRandomPostfix()}`,
        source: 'local',
      }
    })
      .then((resp) => {
        expect(resp.body).property('id');
      });
  },
  newInstance() {
    return cy.okapiRequest({
      method: 'POST',
      path: 'inventory/instances',
      body: {
        childInstances: [],
        discoverySuppress: false,
        id: this.instanceId,
        instanceTypeId: this.instanceTypeId,
        arentInstances: [],
        precedingTitles: [],
        previouslyHeld: false,
        source: `autotest_title_${getRandomPostfix()}`,
        staffSuppress: false,
        succeedingTitles: [],
        title: `autotest_title_${getRandomPostfix()}`,
      }
    });
  },
  newHoldings() {
    return cy.okapiRequest({
      method: 'POST',
      path: 'holdings-storage/holdings',
      body: {
        id: this.holdingsId,
        instanceId: this.instanceId,
        permanentLocationId: NewServicePoint.locationsId,
        sourceId: this.holdingsSourcesId,
      }
    })
      .then((resp) => {
        expect(resp.body).property('id');
      });
  },
  newMaterialType() {
    return cy.okapiRequest({
      method: 'POST',
      path: 'material-types',
      body: {
        id: this.materialTypeId,
        name: `autotest_name_${getRandomPostfix()}`,
        source: 'local',
      }
    })
      .then((resp) => {
        expect(resp.body).property('id');
      });
  },
  newLoanType() {
    return cy.okapiRequest({
      method: 'POST',
      path: 'loan-types',
      body: {
        id: this.loanTypeId,
        name: `autotest_name_${getRandomPostfix()}`,
      }
    })
      .then((resp) => {
        expect(resp.body).property('id');
      });
  },
  newItem() {
    return cy.okapiRequest({
      method: 'POST',
      path: 'inventory/items',
      body: {
        id: this.itemId,
        barcode: this.itemBarcode,
        holdingsRecordId: this.holdingsId,
        materialType: {
          id: this.materialTypeId,
        },
        permanentLoanType: {
          id: this.loanTypeId,
        },
        status: {
          name: 'Available'
        },
      }
    })
      .then((resp) => {
        expect(resp.body).property('barcode');
      });
  },
  deleteNewItem() {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `inventory/items/${this.itemId}`,
    });
  },
  deleteLoanType() {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `loan-types/${this.loanTypeId}`,
    });
  },
  deleteMaterialType() {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `material-types/${this.materialTypeId}`,
    });
  },
  deleteHoldings() {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `holdings-storage/holdings/${this.holdingsId}`,
    });
  },
  deleteInstance() {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `inventory/instances/${this.instanceId}`,
    });
  },
  deleteHoldingsSources() {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `holdings-sources/${this.holdingsSourcesId}`,
    });
  },
  deleteInstanceType() {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `instance-types/${this.instanceTypeId}`,
    });
  },
};
