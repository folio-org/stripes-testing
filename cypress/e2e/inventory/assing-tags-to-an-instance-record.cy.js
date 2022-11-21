import uuid from 'uuid';
import TestTypes from '../../support/dictionary/testTypes';
import TopMenu from '../../support/fragments/topMenu';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import Helper from '../../support/fragments/finance/financeHelper';
import DevTeams from '../../support/dictionary/devTeams';

describe('ui-inventory: Assign tags to an Instance record', () => {
  const instanceTitle = `autoTestInstanceTitle ${Helper.getRandomBarcode()}`;
  const tag = {
    id: uuid(),
    description: uuid(),
    label: uuid()
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
            source: 'FOLIO',
          },
        }).then(specialInstanceId => { instanceId = specialInstanceId; });
      });

    cy.createTagApi(tag).then(tagId => { tag.id = tagId; });
  });

  after(() => {
    cy.deleteTagApi(tag.id);
    InventoryInstance.deleteInstanceViaApi(instanceId);
  });

  it('C196769 Assign tags to an Instance record (folijet)', { tags: [TestTypes.smoke, DevTeams.folijet] }, () => {
    cy.visit(TopMenu.inventoryPath);
    InventorySearchAndFilter.searchByParameter('Title (all)', instanceTitle);
    InventoryInstances.selectInstance();
    InventoryInstance.addTag(tag.label);
    InventoryInstances.resetAllFilters();
    InventoryInstances.searchByTag(tag.label);
    InventorySearchAndFilter.searchByParameter('Title (all)', instanceTitle);
    InventoryInstance.checkAddedTag(tag.label, instanceTitle);
    InventoryInstance.deleteTag(tag.label);
  });
});
