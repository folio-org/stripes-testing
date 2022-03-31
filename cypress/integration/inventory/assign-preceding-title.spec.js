import TopMenu from '../../support/fragments/topMenu';
import getRandomPostfix from '../../support/utils/stringTools';
import InventorySearch from '../../support/fragments/inventory/inventorySearch';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstanceEdit from '../../support/fragments/inventory/InventoryInstanceEdit';

describe('ui-inventory: Assign a Preceding title for an instance', () => {
  const instanceTitle = `autoTestInstanceTitle.${getRandomPostfix()}`;
  const instanceTitle2 = `autoTestInstanceTitle.${getRandomPostfix()}`;
  const precedingTitleValue = 'Preceding title test value';
  const isbnValue = 'ISBN test value';
  const issnValue = 'ISSN test value';

  before('navigate to Inventory', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.getToken(Cypress.env('diku_login'), Cypress.env('diku_password'))
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
        ]).each(instance => cy.createInstance({ instance }));
      });

    cy.visit(TopMenu.inventoryPath);
  });

  it('C9215 In Accordion Title --> Test assigning a Preceding title', () => {
    InventorySearch.searchByParameter('Title (all)', instanceTitle);
    InventoryInstances.selectInstance();
    InventoryInstance.editInstance();
    InventoryInstanceEdit.addPrecedingTitle(0, precedingTitleValue, isbnValue, issnValue);
    InventoryInstanceEdit.saveAndClose();
    InventoryInstance.waitLoading();
    InventoryInstance.checkPrecedingTitle(0, precedingTitleValue, isbnValue, issnValue);
    InventoryInstance.editInstance();
    InventoryInstanceEdit.addExistingPrecedingTitle(instanceTitle2);
    InventoryInstanceEdit.saveAndClose();
    InventoryInstance.checkPrecedingTitle(0, instanceTitle2, '', '');
  });
});
