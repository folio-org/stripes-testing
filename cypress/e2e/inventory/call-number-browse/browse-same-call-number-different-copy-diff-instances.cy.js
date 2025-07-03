import uuid from 'uuid';
import Permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';
import {
  APPLICATION_NAMES,
  CALL_NUMBER_TYPE_NAMES,
  BROWSE_CALL_NUMBER_OPTIONS,
} from '../../../support/constants';
import ItemRecordNew from '../../../support/fragments/inventory/item/itemRecordNew';
import BrowseCallNumber from '../../../support/fragments/inventory/search/browseCallNumber';
import { CallNumberTypes } from '../../../support/fragments/settings/inventory/instances/callNumberTypes';
import { CallNumberBrowseSettings } from '../../../support/fragments/settings/inventory/instances/callNumberBrowse';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    const randomPostfix = getRandomPostfix();
    const randomLetters = getRandomLetters(7);
    const instanceTitlePrefix = `AT_C651492_FolioInstance_${randomPostfix}_`;
    const testData = {
      user: {},
      instances: [],
    };
    const callNumberData = {
      callNumberType: CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS,
      callNumberPrefix: 'pref',
      callNumber: 'QC 651.4 .G92',
      callNumberSuffix: `${randomLetters}`,
    };
    const itemsEnumeration = [
      { volume: 'v.1', enumeration: 'en.1', chronology: 'chr.1', copyNumber: 'c.1' },
      { volume: 'v.2', enumeration: 'en.2', chronology: 'chr.2', copyNumber: 'c.2' },
      { volume: 'v.3', enumeration: 'en.3', chronology: 'chr.3', copyNumber: 'c.3' },
      { volume: 'v.4', enumeration: 'en.4', chronology: 'chr.4', copyNumber: 'c.4' },
      { volume: 'v.5', enumeration: 'en.5', chronology: 'chr.5', copyNumber: 'c.5' },
    ];
    const browseQuery = `${callNumberData.callNumber} ${callNumberData.callNumberSuffix}`;
    const expectedBrowseRow = `${callNumberData.callNumberPrefix} ${callNumberData.callNumber} ${callNumberData.callNumberSuffix}`;

    let callNumberTypeLcId;
    let createdInstanceTitles = [];

    before('Create data and user', () => {
      cy.getAdminToken();
      cy.then(() => {
        CallNumberTypes.getCallNumberTypesViaAPI().then((res) => {
          callNumberTypeLcId = res.filter((type) => type.name === callNumberData.callNumberType)[0]
            .id;
        });
        cy.getLocations({ limit: 1, query: '(isActive=true and name<>"AT_*")' }).then((res) => {
          testData.locationId = res.id;
        });
        cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((res) => {
          testData.loanTypeId = res[0].id;
        });
        cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((res) => {
          testData.materialTypeId = res.id;
        });
      }).then(() => {
        // Create 5 instances, each with 1 holdings and 1 item
        createdInstanceTitles = [];
        const typeId = callNumberTypeLcId;
        for (let i = 0; i < 5; i++) {
          const instanceTitle = `${instanceTitlePrefix}${i + 1}`;
          createdInstanceTitles.push(instanceTitle);
          const instanceData = InventoryInstances.generateFolioInstances({
            instanceTitlePrefix: instanceTitle,
            holdingsCount: 1,
          })[0];
          InventoryInstances.createFolioInstancesViaApi({
            folioInstances: [instanceData],
            location: { id: testData.locationId },
          }).then((createdInstance) => {
            const holdingsId = createdInstance.holdings[0].id;
            ItemRecordNew.createViaApi({
              holdingsId,
              itemBarcode: uuid(),
              materialTypeId: testData.materialTypeId,
              permanentLoanTypeId: testData.loanTypeId,
              itemLevelCallNumber: callNumberData.callNumber,
              itemLevelCallNumberTypeId: typeId,
              itemLevelCallNumberPrefix: callNumberData.callNumberPrefix,
              itemLevelCallNumberSuffix: callNumberData.callNumberSuffix,
              volume: itemsEnumeration[i].volume,
              enumeration: itemsEnumeration[i].enumeration,
              chronology: itemsEnumeration[i].chronology,
              copyNumber: itemsEnumeration[i].copyNumber,
            });
          });
        }
        cy.createTempUser([Permissions.inventoryAll.gui]).then((userProps) => {
          testData.user = userProps;
        });
      });
    });

    beforeEach('Configure call number browse settings', () => {
      cy.getAdminToken();
      CallNumberBrowseSettings.assignCallNumberTypesViaApi({
        name: BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_CONGRESS,
        callNumberTypes: [callNumberTypeLcId],
      });
    });

    after('Clean up', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      InventoryInstances.deleteFullInstancesByTitleViaApi(instanceTitlePrefix);
      CallNumberBrowseSettings.assignCallNumberTypesViaApi({
        name: BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_CONGRESS,
        callNumberTypes: [],
      });
    });

    it(
      'C651492 Browse for same call numbers with different copy numbers (enumeration data) which belongs to different instances (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C651492'] },
      () => {
        cy.login(testData.user.username, testData.user.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventoryInstances.waitContentLoading();
        // Switch to Browse tab and select Library of Congress classification
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
          BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_CONGRESS,
        );
        BrowseCallNumber.waitForCallNumberToAppear(browseQuery, true, 'lc');
        InventorySearchAndFilter.fillInBrowseSearch(browseQuery);
        InventorySearchAndFilter.clickSearch();
        // Assert exact match row, number of titles, and blank title
        InventorySearchAndFilter.verifyBrowseInventorySearchResults({
          records: [{ callNumber: expectedBrowseRow }],
        });
        BrowseCallNumber.checkNumberOfTitlesForRow(expectedBrowseRow, '5');
        BrowseCallNumber.checkValuePresentForRow(expectedBrowseRow, 1, '');
        // Click the call number in the result
        InventorySearchAndFilter.selectFoundItem(expectedBrowseRow);
        // Assert that all 5 created instances are in the search result list
        createdInstanceTitles.forEach((title) => {
          InventorySearchAndFilter.verifySearchResult(title);
        });
        InventorySearchAndFilter.verifyNumberOfSearchResults(createdInstanceTitles.length);
      },
    );
  });
});
