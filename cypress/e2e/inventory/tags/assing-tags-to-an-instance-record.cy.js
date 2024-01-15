import uuid from 'uuid';
import { INSTANCE_SOURCE_NAMES } from '../../../support/constants';
import Helper from '../../../support/fragments/finance/financeHelper';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';

describe('inventory', () => {
  describe('Tags', () => {
    const instanceTitle = `autoTestInstanceTitle ${Helper.getRandomBarcode()}`;
    const tag = {
      id: uuid(),
      description: uuid(),
      label: uuid(),
    };
    let instanceId;

    beforeEach(() => {
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
              source: INSTANCE_SOURCE_NAMES.FOLIO,
            },
          }).then((specialInstanceId) => {
            instanceId = specialInstanceId;
          });
          cy.wait(10000);
        });

      cy.createTagApi(tag).then((tagId) => {
        tag.id = tagId;
      });
    });

    after(() => {
      cy.getAdminToken().then(() => {
        cy.deleteTagApi(tag.id);
        InventoryInstance.deleteInstanceViaApi(instanceId);
      });
    });

    it(
      'C196769 Assign tags to an Instance record (folijet)',
      { tags: ['smoke', 'folijet'] },
      () => {
        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.searchByParameter('Title (all)', instanceTitle);
        InventoryInstances.selectInstance();
        InventoryInstance.addTag(tag.label);
        InventoryInstances.resetAllFilters();
        InventoryInstances.searchByTag(tag.label);
        InventorySearchAndFilter.searchByParameter('Title (all)', instanceTitle);
        InventoryInstance.checkAddedTag(tag.label, instanceTitle);
        InventoryInstance.deleteTag(tag.label);
      },
    );
  });
});
