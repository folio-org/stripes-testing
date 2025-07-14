import Permissions from '../../../../support/dictionary/permissions';
import Users from '../../../../support/fragments/users/users';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import getRandomPostfix, { getRandomLetters } from '../../../../support/utils/stringTools';
import {
  APPLICATION_NAMES,
  CALL_NUMBER_TYPE_NAMES,
  BROWSE_CALL_NUMBER_OPTIONS,
} from '../../../../support/constants';
import ItemRecordNew from '../../../../support/fragments/inventory/item/itemRecordNew';
import BrowseCallNumber from '../../../../support/fragments/inventory/search/browseCallNumber';
import { CallNumberTypes } from '../../../../support/fragments/settings/inventory/instances/callNumberTypes';
import { CallNumberBrowseSettings } from '../../../../support/fragments/settings/inventory/instances/callNumberBrowse';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    const randomPostfix = getRandomPostfix();
    // Test data from the table
    const callNumberTestData = [
      {
        title: `AT_C627505_FolioInstance_Dewey_${randomPostfix}`,
        type: CALL_NUMBER_TYPE_NAMES.DEWAY_DECIMAL,
        value: '627.505',
      },
      {
        title: `AT_C627505_FolioInstance_LC_${randomPostfix}`,
        type: CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS,
        value: 'QS 62 .GA7 E505 6275',
      },
      {
        title: `AT_C627505_FolioInstance_NLM_${randomPostfix}`,
        type: CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_MEDICINE,
        value: 'WA 627.5 B5627 6275',
      },
      {
        title: `AT_C627505_FolioInstance_Other_${randomPostfix}`,
        type: CALL_NUMBER_TYPE_NAMES.OTHER_SCHEME,
        value: 'HEU/G62.7C505',
      },
      {
        title: `AT_C627505_FolioInstance_SuDoc_${randomPostfix}`,
        type: CALL_NUMBER_TYPE_NAMES.SUDOC,
        value: 'L62.s:Oc7/5/505',
      },
      {
        title: `AT_C627505_FolioInstance_UDC_${randomPostfix}`,
        type: CALL_NUMBER_TYPE_NAMES.UDC,
        value: 'DD627.5 .B505 6275',
      },
      {
        title: `AT_C627505_FolioInstance_Local_${randomPostfix}`,
        type: null, // Will be created as a local type
        value: `C627505.${getRandomLetters(7)}`,
      },
    ];
    const querySearchOption = 'Query';
    let tempUser;
    let locationId;
    let loanTypeId;
    let materialTypeId;
    let localTypeId;
    let deweyTypeId;
    let callNumberTypes;

    before('Create data and user', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C627505');
      cy.then(() => {
        CallNumberTypes.getCallNumberTypesViaAPI().then((res) => {
          callNumberTypes = res;
          deweyTypeId = callNumberTypes.find(
            (t) => t.name === CALL_NUMBER_TYPE_NAMES.DEWAY_DECIMAL,
          ).id;
        });
        CallNumberTypes.createCallNumberTypeViaApi({
          name: `AT_C627505_CNType_${randomPostfix}`,
        }).then((id) => {
          localTypeId = id;
        });
        cy.getLocations({ limit: 1, query: '(isActive=true and name<>"AT_*")' }).then((res) => {
          locationId = res.id;
        });
        cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((res) => {
          loanTypeId = res[0].id;
        });
        cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((res) => {
          materialTypeId = res.id;
        });
      })
        .then(() => {
          // Create 7 instances, holdings, and items
          callNumberTestData.forEach((row) => {
            let typeId;
            if (row.type === null) typeId = localTypeId;
            else typeId = callNumberTypes.find((t) => t.name === row.type).id;

            const instanceData = InventoryInstances.generateFolioInstances({
              instanceTitlePrefix: row.title,
              holdingsCount: 1,
            })[0];
            InventoryInstances.createFolioInstancesViaApi({
              folioInstances: [instanceData],
              location: { id: locationId },
            }).then((created) => {
              ItemRecordNew.createViaApi({
                holdingsId: created.holdings[0].id,
                materialTypeId,
                permanentLoanTypeId: loanTypeId,
                itemLevelCallNumber: row.value,
                itemLevelCallNumberTypeId: typeId,
              });
            });
          });
        })
        .then(() => {
          cy.createTempUser([Permissions.inventoryAll.gui]).then((userProps) => {
            tempUser = userProps;
          });
          CallNumberBrowseSettings.assignCallNumberTypesViaApi({
            name: BROWSE_CALL_NUMBER_OPTIONS.DEWEY_DECIMAL,
            callNumberTypes: [CALL_NUMBER_TYPE_NAMES.DEWAY_DECIMAL],
          });
        });
    });

    after('Clean up', () => {
      cy.getAdminToken();
      Users.deleteViaApi(tempUser.userId);
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C627505');
      CallNumberTypes.deleteLocalCallNumberTypeViaApi(localTypeId);
      CallNumberBrowseSettings.assignCallNumberTypesViaApi({
        name: BROWSE_CALL_NUMBER_OPTIONS.DEWEY_DECIMAL,
        callNumberTypes: [],
      });
    });

    it(
      'C627505 Only Call number of selected in settings type could be found in the browse result list by "Dewey Decimal classification" browse option (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'nonParallel', 'C627505'] },
      () => {
        cy.login(tempUser.username, tempUser.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventoryInstances.waitContentLoading();
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
          BROWSE_CALL_NUMBER_OPTIONS.DEWEY_DECIMAL,
        );
        InventorySearchAndFilter.checkBrowseOptionSelected(
          BROWSE_CALL_NUMBER_OPTIONS.DEWEY_DECIMAL,
        );
        BrowseCallNumber.waitForCallNumberToAppear(callNumberTestData[0].value, true, 'dewey');

        // Step 1: Dewey call number
        InventorySearchAndFilter.browseSearch(callNumberTestData[0].value);
        BrowseCallNumber.valueInResultTableIsHighlighted(callNumberTestData[0].value);
        BrowseCallNumber.checkNumberOfTitlesForRow(callNumberTestData[0].value, '1');

        // Step 2: Click on the exact match result
        BrowseCallNumber.clickOnResult(callNumberTestData[0].value);
        InventorySearchAndFilter.verifySearchOptionAndQuery(
          querySearchOption,
          `itemFullCallNumbers="${callNumberTestData[0].value}"`,
        );
        InventorySearchAndFilter.verifySearchOptionAndQuery(
          querySearchOption,
          `item.effectiveCallNumberComponents.typeId=="${deweyTypeId}"`,
        );
        InventorySearchAndFilter.verifyInstanceDisplayed(callNumberTestData[0].title);
        InventorySearchAndFilter.verifyNumberOfSearchResults(1);
        // Return to browse
        InventorySearchAndFilter.switchToBrowseTab();
        BrowseCallNumber.valueInResultTableIsHighlighted(callNumberTestData[0].value);

        // Steps 4-9: All other types should NOT be found
        callNumberTestData.slice(1).forEach((callNumber) => {
          InventorySearchAndFilter.clickResetAllButton();
          InventorySearchAndFilter.checkBrowseResultListCallNumbersExists(false);
          InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
            BROWSE_CALL_NUMBER_OPTIONS.DEWEY_DECIMAL,
          );
          InventorySearchAndFilter.checkBrowseOptionSelected(
            BROWSE_CALL_NUMBER_OPTIONS.DEWEY_DECIMAL,
          );
          InventorySearchAndFilter.browseSearch(callNumber.value);
          BrowseCallNumber.checkNotExistingCallNumber(callNumber.value);
          BrowseCallNumber.checkValuePresentInResults(callNumber.value, false);
        });
      },
    );
  });
});
