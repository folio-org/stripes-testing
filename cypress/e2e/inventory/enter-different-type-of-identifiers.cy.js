import TestTypes from '../../support/dictionary/testTypes';
import InventorySearch from '../../support/fragments/inventory/inventorySearch';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstanceEdit from '../../support/fragments/inventory/InventoryInstanceEdit';
import Helper from '../../support/fragments/finance/financeHelper';
import TopMenu from '../../support/fragments/topMenu';
import DevTeams from '../../support/dictionary/devTeams';

describe('ui-inventory: Enter different type of identifiers', () => {
  let instanceTitle;
  let instanceId;
  let resourceIdentifier;

  beforeEach('create test data', () => {
    instanceTitle = `autoTestInstanceTitle ${Helper.getRandomBarcode()}`;
    cy.loginAsAdmin();
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

  afterEach('delete test data', () => {
    InventoryInstance.deleteInstanceViaApi(instanceId);
  });

  const searchAndOpenInstance = (parametr, title) => {
    cy.intercept('GET', '/holdings-sources?*').as('getHoldSources');
    cy.visit(TopMenu.inventoryPath);
    cy.wait(['@getHoldSources']);
    InventorySearch.searchByParameter(parametr, title);
    InventoryInstances.selectInstance();
  };

  [
    'ASIN',
    'BNB'
  ].forEach((identifier) => {
    it('C609 In Accordion Identifiers --> enter different type of identifiers (folijet) (prokopovych)', { tags: [TestTypes.smoke, DevTeams.folijet] }, () => {
      resourceIdentifier = `testResourceIdentifier ${Helper.getRandomBarcode()}`;

      searchAndOpenInstance('Title (all)', instanceTitle);
      InventoryInstance.editInstance();
      InventoryInstanceEdit.addIdentifier(identifier, resourceIdentifier);
      searchAndOpenInstance('Keyword (title, contributor, identifier, HRID, UUID)', resourceIdentifier);
      InventoryInstance.checkInstanceIdentifier(resourceIdentifier);
    });
  });
});
