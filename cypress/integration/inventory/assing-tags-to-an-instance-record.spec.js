import uuid from 'uuid';
import TestTypes from '../../support/dictionary/testTypes';
import TopMenu from '../../support/fragments/topMenu';
import getRandomPostfix from '../../support/utils/stringTools';
import InventorySearch from '../../support/fragments/inventory/inventorySearch';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';

describe('ui-inventory: Assign tags to an Instance record', () => {
  const instanceTitle = `autoTestInstanceTitle.${getRandomPostfix()}`;
  const tag = {
    id: uuid(),
    // TODO: bug UIIN-1994
    description: `auto-test-tag-name-${uuid()}`,
    label: `auto-test-tag-name-${uuid()}`
  };
  let instanceId;

  beforeEach(() => {
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

    cy.createTagApi(tag).then(tagId => { tag.id = tagId; });
  });

  after(() => {
    cy.deleteTagApi(tag.id);
    cy.deleteInstanceApi(instanceId);
  });

  it('C196769 Assign tags to an Instance record', { tags: [TestTypes.smoke] }, () => {
    cy.visit(TopMenu.inventoryPath);
    InventorySearch.searchByParameter('Title (all)', instanceTitle);
    InventoryInstances.selectInstance();
    InventoryInstance.addTag(tag.label);
    InventoryInstances.resetAllFilters();
    InventoryInstances.searchByTag(tag.label);
    InventorySearch.searchByParameter('Title (all)', instanceTitle);
    InventoryInstance.checkAddedTag(tag.label, instanceTitle);
    InventoryInstance.deleteTag(tag.label);
  });
});
