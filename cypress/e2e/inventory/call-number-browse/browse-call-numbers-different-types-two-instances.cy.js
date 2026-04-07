import { Permissions } from '../../../support/dictionary';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseCallNumber from '../../../support/fragments/inventory/search/browseCallNumber';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';
import {
  ITEM_STATUS_NAMES,
  CALL_NUMBER_TYPE_NAMES,
  BROWSE_CALL_NUMBER_OPTIONS,
} from '../../../support/constants';
import { CallNumberTypes } from '../../../support/fragments/settings/inventory/instances/callNumberTypes';
import { CallNumberBrowseSettings } from '../../../support/fragments/settings/inventory/instances/callNumberBrowse';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    describe('Browse configuration checks', () => {
      const randomPostfix = getRandomPostfix();
      const randomLetters = getRandomLetters(7);
      const instanceTitlePrefix = `AT_C656308_FolioInstance_${randomPostfix}`;

      // 3 call numbers with different types, same for both instances
      const callNumberEntries = [
        { callNumber: `${randomLetters} 308`, typeName: CALL_NUMBER_TYPE_NAMES.DEWAY_DECIMAL },
        {
          callNumber: `${randomLetters} Z636.R308 2077`,
          typeName: CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS,
        },
        {
          callNumber: `${randomLetters} WB 656.3 B6563 2308`,
          typeName: CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_MEDICINE,
        },
      ];

      const callNumberSettings = [
        { name: BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL, callNumberTypes: [] },
        {
          name: BROWSE_CALL_NUMBER_OPTIONS.DEWEY_DECIMAL,
          callNumberTypes: [CALL_NUMBER_TYPE_NAMES.DEWAY_DECIMAL],
        },
        {
          name: BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_CONGRESS,
          callNumberTypes: [CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS],
        },
        {
          name: BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_MEDICINE,
          callNumberTypes: [
            CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_MEDICINE,
            CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS,
          ],
        },
      ];

      // For each browse option, which callNumberEntries indices should be found
      const browseExpectations = {
        [BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL]: [0, 1, 2],
        [BROWSE_CALL_NUMBER_OPTIONS.DEWEY_DECIMAL]: [0],
        [BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_CONGRESS]: [1],
        [BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_MEDICINE]: [1, 2],
      };

      let user;
      let location;
      let callNumberTypeIds;
      let instanceTypeId;
      let holdingsTypeId;
      let loanTypeId;
      let materialTypeId;

      before('Create test data', () => {
        cy.getAdminToken()
          .then(() => {
            InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C656308');
            CallNumberTypes.deleteCallNumberTypesLike('AT_C656308');

            cy.getLocations({
              limit: 1,
              query: '(isActive=true and name<>"AT_*" and name<>"*auto*")',
            }).then((res) => {
              location = res;
            });
            cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
              instanceTypeId = instanceTypes[0].id;
            });
            cy.getHoldingTypes({ limit: 1 }).then((res) => {
              holdingsTypeId = res[0].id;
            });
            cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((res) => {
              loanTypeId = res[0].id;
            });
            cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((res) => {
              materialTypeId = res.id;
            });
            CallNumberTypes.getCallNumberTypesViaAPI().then((res) => {
              callNumberTypeIds = {};
              callNumberEntries.forEach((entry) => {
                if (entry.typeName) {
                  const found = res.find((t) => t.name === entry.typeName);
                  if (found) callNumberTypeIds[entry.typeName] = found.id;
                }
              });
            });
          })
          .then(() => {
            // Create 2 instances, each with 3 holdings + 1 item per holding
            const createInstance = (instanceIndex) => {
              return InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId,
                  title: `${instanceTitlePrefix}_${instanceIndex}`,
                },
                holdings: callNumberEntries.map(() => ({
                  holdingsTypeId,
                  permanentLocationId: location.id,
                })),
              }).then((createdInstance) => {
                createdInstance.holdingIds.forEach((holding, idx) => {
                  const entry = callNumberEntries[idx];
                  cy.createItem({
                    holdingsRecordId: holding.id,
                    materialType: { id: materialTypeId },
                    permanentLoanType: { id: loanTypeId },
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                    itemLevelCallNumber: entry.callNumber,
                    ...(entry.typeName && {
                      itemLevelCallNumberTypeId: callNumberTypeIds[entry.typeName],
                    }),
                  });
                });
              });
            };

            createInstance(1).then(() => createInstance(2));
          })
          .then(() => {
            cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
              user = userProperties;

              callNumberSettings.forEach((setting) => {
                CallNumberBrowseSettings.assignCallNumberTypesViaApi(setting);
              });

              cy.login(user.username, user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
                authRefresh: true,
              });
              InventorySearchAndFilter.switchToBrowseTab();
              InventorySearchAndFilter.validateBrowseToggleIsSelected();
            });
          });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        callNumberSettings.forEach((setting) => {
          CallNumberBrowseSettings.assignCallNumberTypesViaApi({
            ...setting,
            callNumberTypes: [],
          });
        });
        InventoryInstances.deleteFullInstancesByTitleViaApi(instanceTitlePrefix);
        Users.deleteViaApi(user.userId);
      });

      it(
        'C656308 Browse for call numbers of different types when they belong to 2 Instances (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'nonParallel', 'C656308'] },
        () => {
          // Wait for all call numbers to be indexed
          callNumberEntries.forEach((entry) => {
            BrowseCallNumber.waitForCallNumberToAppear(entry.callNumber, true, undefined, 2);
          });

          // Test each browse option
          Object.entries(browseExpectations).forEach(([browseOption, expectedIndices]) => {
            InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(browseOption);

            callNumberEntries.forEach((entry, index) => {
              InventorySearchAndFilter.browseSearch(entry.callNumber);
              if (expectedIndices.includes(index)) {
                BrowseCallNumber.valueInResultTableIsHighlighted(entry.callNumber);
              } else {
                BrowseCallNumber.checkNonExactSearchResult(entry.callNumber);
              }
            });
          });
        },
      );
    });
  });
});
