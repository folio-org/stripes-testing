import uuid from 'uuid';
import { INSTANCE_SOURCE_NAMES } from '../../../../support/constants';
import Helper from '../../../../support/fragments/finance/financeHelper';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../../support/fragments/topMenu';
import { parseSanityParameters } from '../../../../support/utils/users';

const { user, memberTenant } = parseSanityParameters();

describe('Inventory', () => {
  describe('Tags', () => {
    const instanceTitle = `autoTestInstanceTitle ${Helper.getRandomBarcode()}`;
    const tag = {
      id: uuid(),
      description: uuid(),
      label: uuid(),
    };
    let instanceId;

    before('Create test data and login', () => {
      cy.setTenant(memberTenant.id);
      cy.getUserToken(user.username, user.password)
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
        });

      cy.createTagApi(tag).then((tagId) => {
        tag.id = tagId;
      });

      cy.setTenant(memberTenant.id);
      cy.getUserToken(user.username, user.password);

      cy.allure().logCommandSteps(false);
      cy.login(user.username, user.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
      cy.allure().logCommandSteps(true);
    });

    after('Delete test data', () => {
      cy.setTenant(memberTenant.id);
      cy.getUserToken(user.username, user.password).then(() => {
        cy.deleteTagApi(tag.id);
        InventoryInstance.deleteInstanceViaApi(instanceId);
      });
    });

    it(
      'C196769 Assign tags to an Instance record (folijet)',
      { tags: ['dryRun', 'folijet'] },
      () => {
        InventorySearchAndFilter.searchByParameter('Title (all)', instanceTitle);
        InventoryInstances.selectInstance();
        InventoryInstance.addTag(tag.label);
        InventoryInstances.resetAllFilters();
        InventoryInstances.searchByTag(tag.label);
        InventorySearchAndFilter.searchByParameter('Title (all)', instanceTitle);
        InventoryInstance.checkAddedTag(tag.label, instanceTitle);
        InventoryInstance.deleteTag(tag.label);
        cy.reload();
      },
    );
  });
});
