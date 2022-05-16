import TestTypes from '../../support/dictionary/testTypes';
import getRandomPostfix from '../../support/utils/stringTools';
import TopMenu from '../../support/fragments/topMenu';
import InventorySearch from '../../support/fragments/inventory/inventorySearch';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstanceEdit from '../../support/fragments/inventory/InventoryInstanceEdit';

describe('ui-inventory: Enter different type of identifiers', () => {
  const instanceTitle = `autoTestInstanceTitle.${getRandomPostfix()}`;
  let instanceId;

  beforeEach('navigate to inventory', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.getAdminToken()
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

  afterEach(() => {
    cy.deleteInstanceApi(instanceId);
  });

  [
    'ASIN',
    'BNB',
  ].forEach((identifier) => {
    it('C609 In Accordion Identifiers --> enter different type of identifiers', { tags: [TestTypes.smoke] }, () => {
      cy.visit(TopMenu.inventoryPath);
      InventorySearch.searchByParameter('Title (all)', instanceTitle);
      InventoryInstances.selectInstance();
      InventoryInstance.editInstance();
      InventoryInstanceEdit.addIdentifier(identifier);
      InventorySearch.searchByParameter('Identifier (all)', identifier);
      InventoryInstance.checkInstanceIdentifier(identifier);
    });
  });
});
