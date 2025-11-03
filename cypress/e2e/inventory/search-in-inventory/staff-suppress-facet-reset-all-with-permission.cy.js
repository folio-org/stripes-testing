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
      const instanceTitlePrefix = `AT_C446091_Instance_${randomPostfix}`;
      const accordionName = 'Staff suppress';
      const staffSuppressedInstanceIndexes = [3, 4];
      const notStaffSuppressedInstanceIndexes = [1, 2];
      const folioInstanceIndexes = [1, 3];

      const isStaffSuppressed = (index) => [...staffSuppressedInstanceIndexes].includes(index);

      const instanceIds = [];
      let user;

      before('Create test data and login', () => {
        cy.getAdminToken();
        InventoryInstances.deleteInstanceByTitleViaApi('AT_C446091_Instance');

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
            Permissions.uiInventoryViewInstances.gui,
            Permissions.enableStaffSuppressFacet.gui,
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
        'C446091 Staff suppress facet resets when user with permission clicks "Reset all" button (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C446091'] },
        () => {
          InventorySearchAndFilter.verifyAccordionExistance(accordionName);

          InventoryInstances.searchByTitle(instanceTitlePrefix);
          InventorySearchAndFilter.verifyResultListExists();
          InventorySearchAndFilter.checkRowsCount(
            notStaffSuppressedInstanceIndexes.length + staffSuppressedInstanceIndexes.length,
          );
          [...notStaffSuppressedInstanceIndexes, ...staffSuppressedInstanceIndexes].forEach(
            (index) => {
              InventorySearchAndFilter.verifySearchResult(`${instanceTitlePrefix}_${index}`);
            },
          );

          InventoryInstances.searchBySource(INSTANCE_SOURCE_NAMES.FOLIO);
          InventorySearchAndFilter.checkRowsCount(folioInstanceIndexes.length);
          folioInstanceIndexes.forEach((index) => {
            InventorySearchAndFilter.verifySearchResult(`${instanceTitlePrefix}_${index}`);
          });

          InventorySearchAndFilter.expandAccordion(accordionName);
          InventorySearchAndFilter.selectOptionInExpandedFilter(accordionName, 'No');
          InventorySearchAndFilter.checkRowsCount(1);
          InventorySearchAndFilter.verifySearchResult(`${instanceTitlePrefix}_1`);

          InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
          InventorySearchAndFilter.verifyCheckboxInAccordion(accordionName, 'No', false);
          InventorySearchAndFilter.verifyCheckboxInAccordion(accordionName, 'Yes', false);
        },
      );
    });
  });
});
