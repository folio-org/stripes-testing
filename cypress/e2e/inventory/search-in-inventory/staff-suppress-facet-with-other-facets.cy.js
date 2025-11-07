import { Permissions } from '../../../support/dictionary';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import getRandomPostfix from '../../../support/utils/stringTools';
import { INSTANCE_SOURCE_NAMES } from '../../../support/constants';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Filters', () => {
      const randomPostfix = getRandomPostfix();
      const instanceTitlePrefix = `AT_C446079_Instance_${randomPostfix}`;
      const accordionName = 'Staff suppress';
      const staffSuppressedInstanceIndexes = [3, 4];
      const marcInstanceIndexes = [2, 4];

      const isStaffSuppressed = (index) => [...staffSuppressedInstanceIndexes].includes(index);

      const instanceIds = [];
      let user;

      before('Create test data and login', () => {
        cy.getAdminToken();
        InventoryInstances.deleteInstanceByTitleViaApi('AT_C446079_Instance');

        cy.then(() => {
          cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
            // Create 2 FOLIO instances
            [1, 3].forEach((folioIndex) => {
              const instance = {
                title: `${instanceTitlePrefix}_${folioIndex}`,
                instanceTypeId: instanceTypes[0].id,
              };
              if (isStaffSuppressed(folioIndex)) {
                instance.staffSuppress = true;
              }
              InventoryInstances.createFolioInstanceViaApi({
                instance,
              }).then((instanceData) => {
                instanceIds.push(instanceData.instanceId);
              });
            });

            // Create 2 MARC instances
            [2, 4].forEach((marcIndex) => {
              cy.createSimpleMarcBibViaAPI(`${instanceTitlePrefix}_${marcIndex}`).then(
                (instanceId) => {
                  instanceIds.push(instanceId);

                  if (isStaffSuppressed(marcIndex)) {
                    cy.getInstanceById(instanceId).then((body) => {
                      cy.updateInstance({ ...body, staffSuppress: true });
                    });
                  }
                },
              );
            });
          });
        }).then(() => {
          cy.createTempUser([
            Permissions.enableStaffSuppressFacet.gui,
            Permissions.uiInventoryViewInstances.gui,
          ]).then((userProperties) => {
            user = userProperties;
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
              authRefresh: true,
            });
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        instanceIds.forEach((id) => {
          InventoryInstance.deleteInstanceViaApi(id);
        });
      });

      it(
        'C446079 Staff suppress facet is off by default when other facets are applied (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C446079'] },
        () => {
          InventorySearchAndFilter.verifyAccordionExistance(accordionName);
          InventorySearchAndFilter.expandAccordion(accordionName);
          InventorySearchAndFilter.verifyAccordionByNameExpanded(accordionName, true);
          InventorySearchAndFilter.verifyCheckboxInAccordion(accordionName, 'No', false);
          InventorySearchAndFilter.verifyCheckboxInAccordion(accordionName, 'Yes', false);

          InventoryInstances.searchByTitle(instanceTitlePrefix);
          InventorySearchAndFilter.verifyResultListExists();

          InventoryInstances.searchBySource(INSTANCE_SOURCE_NAMES.MARC);
          InventorySearchAndFilter.checkRowsCount(marcInstanceIndexes.length);
          marcInstanceIndexes.forEach((index) => {
            InventorySearchAndFilter.verifySearchResult(`${instanceTitlePrefix}_${index}`);
          });

          InventorySearchAndFilter.selectOptionInExpandedFilter(accordionName, 'Yes');
          InventorySearchAndFilter.checkRowsCount(1);
          InventorySearchAndFilter.verifySearchResult(`${instanceTitlePrefix}_4`);

          InventorySearchAndFilter.selectOptionInExpandedFilter(accordionName, 'Yes', false);
          InventorySearchAndFilter.selectOptionInExpandedFilter(accordionName, 'No');
          InventorySearchAndFilter.checkRowsCount(1);
          InventorySearchAndFilter.verifySearchResult(`${instanceTitlePrefix}_2`);

          cy.wait(3000); // wait for UI to stabilize
        },
      );
    });
  });
});
