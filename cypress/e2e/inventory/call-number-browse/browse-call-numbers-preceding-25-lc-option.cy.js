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
import {
  CallNumberBrowseSettings,
  callNumbersIds,
} from '../../../support/fragments/settings/inventory/instances/callNumberBrowse';
import BrowseClassifications from '../../../support/fragments/inventory/search/browseClassifications';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    const numberOfInventory = 26;
    const randomPostfix = getRandomPostfix();
    const randomLetters = getRandomLetters(7);
    const callNumberPrefix = `${randomLetters} PR3874.85 .B`;
    const callNumberBrowseCode = callNumbersIds[BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_CONGRESS];
    const callNumbers = Array.from(
      { length: numberOfInventory - 1 },
      (_, i) => `${callNumberPrefix}${10 + i}`,
    );
    callNumbers.push(`${callNumberPrefix}4`);
    const precedingCallNumbers = Array.from({ length: 6 }, (_, i) => `${randomLetters} AAA${i}`);
    const instanceTitlePrefix = `AT_C387485_FolioInstance_${randomPostfix}`;
    const folioInstances = [];

    let location;
    let user;
    let callNumberTypeId;

    before('Create test data', () => {
      cy.getAdminToken()
        .then(() => {
          InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C387485');

          cy.getLocations({
            limit: 1,
            query: '(isActive=true and name<>"AT_*" and name<>"*auto*")',
          }).then((res) => {
            location = res;
          });

          CallNumberTypes.getCallNumberTypesViaAPI().then((res) => {
            callNumberTypeId = res.find(
              (type) => type.name === CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS,
            ).id;

            callNumbers.forEach((callNumber) => {
              folioInstances.push(
                InventoryInstances.generateFolioInstances({
                  instanceTitlePrefix,
                  items: [
                    {
                      status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                      itemLevelCallNumber: callNumber,
                      itemLevelCallNumberTypeId: callNumberTypeId,
                    },
                  ],
                })[0],
              );
            });

            // data for instances with preceding call numbers
            // so that there would always be previous result page available
            precedingCallNumbers.forEach((callNumber) => {
              folioInstances.push(
                InventoryInstances.generateFolioInstances({
                  instanceTitlePrefix,
                  items: [
                    {
                      status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                      itemLevelCallNumber: callNumber,
                      itemLevelCallNumberTypeId: callNumberTypeId,
                    },
                  ],
                })[0],
              );
            });
          });
        })
        .then(() => {
          InventoryInstances.createFolioInstancesViaApi({
            folioInstances,
            location,
          });
        })
        .then(() => {
          cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
            user = userProperties;

            CallNumberBrowseSettings.assignCallNumberTypesViaApi({
              name: BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_CONGRESS,
              callNumberTypes: [],
            });

            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
              authRefresh: true,
            });
            InventorySearchAndFilter.switchToBrowseTab();
            InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
              BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_CONGRESS,
            );
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi(instanceTitlePrefix);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C387485 Exact match result is found when browse for call number which has (at least) 25 preceding call numbers using "Library of Congress classification" browse option (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C387485'] },
      () => {
        [...callNumbers, ...precedingCallNumbers].forEach((callNumber) => {
          BrowseCallNumber.waitForCallNumberToAppear(callNumber, true, callNumberBrowseCode);
        });

        // Step 2: Browse for the last call number in the sequence (B4)
        const lastCallNumber = callNumbers.at(-1);
        InventorySearchAndFilter.browseSearch(lastCallNumber);
        BrowseCallNumber.valueInResultTableIsHighlighted(lastCallNumber);
        callNumbers.slice(-6).forEach((callNumber) => {
          BrowseCallNumber.checkValuePresentInResults(callNumber);
        });

        // Step 3: Browse for the first call number in the sequence (B10)
        const firstCallNumber = callNumbers[0];
        InventorySearchAndFilter.browseSearch(firstCallNumber);
        BrowseCallNumber.valueInResultTableIsHighlighted(firstCallNumber);
        callNumbers.forEach((callNumber) => {
          BrowseCallNumber.checkValuePresentInResults(callNumber);
        });

        // Step 4: Click "Previous" button several times and verify preceding results
        BrowseCallNumber.checkPreviousPaginationButtonActive();
        BrowseCallNumber.clickPreviousPaginationButton();
        callNumbers.forEach((callNumber) => {
          BrowseCallNumber.checkValuePresentInResults(callNumber, false);
        });
        BrowseCallNumber.checkSearchResultsTable();
        BrowseCallNumber.checkCallNumbersShown();

        BrowseClassifications.getPreviousPaginationButtonState().then((previousEnabled) => {
          if (previousEnabled) {
            BrowseCallNumber.clickPreviousPaginationButton();
            callNumbers.forEach((callNumber) => {
              BrowseCallNumber.checkValuePresentInResults(callNumber, false);
            });
            BrowseCallNumber.checkSearchResultsTable();
            BrowseCallNumber.checkCallNumbersShown();
          }
        });
      },
    );
  });
});
