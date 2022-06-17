import TestTypes from '../../support/dictionary/testTypes';
import getRandomPostfix from '../../support/utils/stringTools';
import InventorySearch from '../../support/fragments/inventory/inventorySearch';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstanceEdit from '../../support/fragments/inventory/InventoryInstanceEdit';
import Helper from '../../support/fragments/finance/financeHelper';
import TopMenu from '../../support/fragments/topMenu';

describe('ui-inventory: Enter different type of identifiers', () => {
  let instanceTitle;
  let instanceId;
  let resourceIdentifier;

  beforeEach('navigate to inventory', () => {
    instanceTitle = `autoTestInstanceTitle ${Helper.getRandomBarcode()}`;
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
    'BNB'
  ].forEach((identifier) => {
    it('C609 In Accordion Identifiers --> enter different type of identifiers', { tags: [TestTypes.smoke] }, () => {
      resourceIdentifier = `testResourceIdentifier.${getRandomPostfix()}`;

      cy.visit(TopMenu.inventoryPath);
      InventorySearch.searchByParameter('Title (all)', instanceTitle);
      InventoryInstances.selectInstance();
      InventoryInstance.editInstance();
      InventoryInstanceEdit.addIdentifier(identifier, resourceIdentifier);
      InventorySearch.searchByParameter('Keyword (title, contributor, identifier)', resourceIdentifier);
      InventoryInstances.selectInstance();
      InventoryInstance.checkInstanceIdentifier(resourceIdentifier);
    });
  });
});
