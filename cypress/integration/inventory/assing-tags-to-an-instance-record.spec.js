import TestTypes from '../../support/dictionary/testTypes';
import TopMenu from '../../support/fragments/topMenu';
import getRandomPostfix from '../../support/utils/stringTools';
import InventorySearch from '../../support/fragments/inventory/inventorySearch';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';

describe('ui-inventory: Assign tags to an Instance record', () => {
  const instanceTitle = `autoTestInstanceTitle.${getRandomPostfix()}`;
  let instanceId;

  beforeEach(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.getToken(Cypress.env('diku_login'), Cypress.env('diku_password'))
      .then(() => {
        cy.getInstanceTypes({ limit: 1 });
        cy.getInstanceIdentifierTypes({ limit: 1 });
      })
      .then(() => {
        cy.createInstance({
          instance: {
            instanceTypeId: Cypress.env('instanceTypes')[0].id,
            title: instanceTitle,
            source: 'FOLIO',
          },
        }).then(specialInstanceId => { instanceId = specialInstanceId; });
      });
  });

  after(() => {
    //cy.deleteInstanceApi(instanceId);
  });

  it('C196769 Assign tags to an Instance record', { tags: [TestTypes.smoke] }, () => {
    cy.visit(TopMenu.inventoryPath);
    InventorySearch.searchByParameter('Title (all)', instanceTitle);
    InventoryInstances.selectInstance();
    //InventoryInstances.waitLoading();
    InventoryInstance.addTag();
    InventoryInstance.resetAll();
    InventoryInstance.searchByTag(instanceTitle);
    InventorySearch.searchByParameter('Title (all)', instanceTitle);
    InventoryInstance.checkAddedTag(instanceTitle);
  });
});
