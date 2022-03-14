import TestTypes from '../../support/dictionary/testTypes';
import getRandomPostfix from '../../support/utils/stringTools';
import TopMenu from '../../support/fragments/topMenu';
import InventorySearch from '../../support/fragments/inventory/inventorySearch';
import inventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import inventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstanceEdit from '../../support/fragments/inventory/InventoryInstanceEdit';

describe('enter different type of identifiers', () => {
  const instanceTitle = `autoTestInstanceTitle.${getRandomPostfix()}`;

  beforeEach('navigate to inventory', () => {
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
        });
      });
  });

  afterEach(() => {
    cy.getInstanceIdApi()
      .then(({ body }) => {
        cy.deleteInstanceApi(body.instances[body.instances.length - 1].id);
      });
  });

  [
    'ASIN',
    'BNB',
  ].forEach((identifier) => {
    it('C609 In Accordion Identifiers --> enter different type of identifiers', { tags: [TestTypes.smoke] }, () => {
      cy.visit(TopMenu.inventoryPath);
      InventorySearch.searchByParameter('Title (all)', instanceTitle);
      inventoryInstances.selectInstance();
      inventoryInstance.editInstance();
      InventoryInstanceEdit.addIdentifier(identifier);
      InventorySearch.searchByParameter('Identifier (all)', identifier);
      inventoryInstance.checkInstanceIdentifier(identifier);
    });
  });
});
