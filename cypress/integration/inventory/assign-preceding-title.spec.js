import TopMenu from '../../support/fragments/topMenu';
import getRandomPostfix from '../../support/utils/stringTools';
import InventorySearch from '../../support/fragments/inventory/inventorySearch';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstanceEdit from '../../support/fragments/inventory/InventoryInstanceEdit';
import TestTypes from '../../support/dictionary/testTypes';

describe('ui-inventory: Assign a Preceding title for an instance', () => {
  const instanceIds = [];
  const instanceTitle = `autoTestInstanceTitle.${getRandomPostfix()}`;
  const instanceTitle2 = `autoTestInstanceTitle.${getRandomPostfix()}`;
  const precedingTitleValue = `Preceding title test value ${getRandomPostfix()}`;
  const isbnValue = `ISBN test value ${getRandomPostfix()}`;
  const issnValue = `ISSN test value ${getRandomPostfix()}`;

  before('navigate to Inventory', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.getAdminToken()
      .then(() => {
        cy.getInstanceTypes({ limit: 1 });
        cy.getInstanceIdentifierTypes({ limit: 1 });
      })
      .then(() => {
        cy.wrap([
          {
            instanceTypeId: Cypress.env('instanceTypes')[0].id,
            title: instanceTitle,
            source: 'FOLIO',
          }, {
            instanceTypeId: Cypress.env('instanceTypes')[0].id,
            title: instanceTitle2,
            source: 'FOLIO',
          }
        ]).each((instance, i) => cy.createInstance({ instance }).then(specialInstanceId => { instanceIds[i] = specialInstanceId; }));
      });

    cy.visit(TopMenu.inventoryPath);
  });

  after(() => {
    cy.getInstanceById(instanceIds[0])
      .then(body => {
        const requestBody = body;
        requestBody.precedingTitles = [];

        // reset precedingTitles to get rid of tables dependencies and be able to delete the instances
        cy.updateInstance(requestBody);
      })
      .then(() => {
        instanceIds.forEach(instanceId => cy.deleteInstanceApi(instanceId));
      });
  });

  it('C9215 In Accordion Title --> Test assigning a Preceding title', { tags:  [TestTypes.smoke] }, () => {
    InventorySearch.searchByParameter('Title (all)', instanceTitle);
    InventoryInstances.selectInstance();
    InventoryInstance.editInstance();
    InventoryInstanceEdit.addPrecedingTitle(0, precedingTitleValue, isbnValue, issnValue);
    InventoryInstanceEdit.saveAndClose();
    InventoryInstance.checkPrecedingTitle(0, precedingTitleValue, isbnValue, issnValue);
    InventoryInstance.editInstance();
    InventoryInstanceEdit.addExistingPrecedingTitle(instanceTitle2);
    InventoryInstanceEdit.saveAndClose();
    InventoryInstance.checkPrecedingTitle(0, instanceTitle2, '', '');
  });
});
