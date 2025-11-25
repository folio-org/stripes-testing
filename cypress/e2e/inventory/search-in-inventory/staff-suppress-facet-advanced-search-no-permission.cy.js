import { Permissions } from '../../../support/dictionary';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import getRandomPostfix from '../../../support/utils/stringTools';
import { ADVANCED_SEARCH_MODIFIERS } from '../../../support/constants';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const randomPostfix = getRandomPostfix();
    const instanceTitlePrefix = `AT_C446077_Instance_${randomPostfix}`;
    const accordionName = 'Staff suppress';
    const staffSuppressedInstanceIndexes = [3, 4];
    const notStaffSuppressedInstanceIndexes = [1, 2];
    const keywordSearchOption = 'Keyword (title, contributor, identifier)';
    const advSearchModifier = ADVANCED_SEARCH_MODIFIERS.CONTAINS_ALL;

    const isStaffSuppressed = (index) => [...staffSuppressedInstanceIndexes].includes(index);

    const instanceIds = [];
    let user;

    before('Create test data and login', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceByTitleViaApi('AT_C446077_Instance');

      cy.then(() => {
        cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
          // Create 2 FOLIO instances
          [2, 4].forEach((folioIndex) => {
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
          [1, 3].forEach((marcIndex) => {
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
        cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((userProperties) => {
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
      'C446077 Staff suppressed records can NOT be found using Advanced search when user doesn\'t have "Inventory: Enable staff suppress facet" permission (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C446077'] },
      () => {
        InventorySearchAndFilter.instanceTabIsDefault();
        InventorySearchAndFilter.validateSearchTabIsDefault();
        InventorySearchAndFilter.verifyAccordionExistance(accordionName, false);

        InventoryInstances.clickAdvSearchButton();
        InventoryInstances.fillAdvSearchRow(
          0,
          instanceTitlePrefix,
          advSearchModifier,
          keywordSearchOption,
        );
        InventoryInstances.clickSearchBtnInAdvSearchModal();
        InventoryInstances.checkAdvSearchModalAbsence();

        InventorySearchAndFilter.verifyResultListExists();
        InventorySearchAndFilter.checkRowsCount(notStaffSuppressedInstanceIndexes.length);
        notStaffSuppressedInstanceIndexes.forEach((index) => {
          InventorySearchAndFilter.verifySearchResult(`${instanceTitlePrefix}_${index}`);
        });
      },
    );
  });
});
