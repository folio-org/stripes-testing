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
    const instanceTitle = `AT_C651491_FolioInstance_${randomPostfix}`;
    const testData = {
      user: {},
    };
    const callNumberData = {
      callNumberType: CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS,
      callNumberPrefix: 'pref',
      callNumber: 'QC 651.4 .G91',
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

    let instanceData;
    let holdingsId;
    let callNumberTypeLcId;

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
        instanceData = InventoryInstances.generateFolioInstances({
          instanceTitlePrefix: instanceTitle,
          holdingsCount: 1,
        })[0];
        InventoryInstances.createFolioInstancesViaApi({
          folioInstances: [instanceData],
          location: { id: testData.locationId },
        }).then((createdInstance) => {
          instanceData.id = createdInstance.instanceId;
          holdingsId = createdInstance.holdings[0].id;
        });
        cy.createTempUser([Permissions.inventoryAll.gui]).then((userProps) => {
          testData.user = userProps;
        });
      });
    });

    beforeEach('Create 5 items with same call number, different enumeration/copy', () => {
      cy.getAdminToken();
      for (const itemEnum of itemsEnumeration) {
        ItemRecordNew.createViaApi({
          holdingsId,
          itemBarcode: uuid(),
          materialTypeId: testData.materialTypeId,
          permanentLoanTypeId: testData.loanTypeId,
          itemLevelCallNumber: callNumberData.callNumber,
          itemLevelCallNumberTypeId: callNumberTypeLcId,
          itemLevelCallNumberPrefix: callNumberData.callNumberPrefix,
          itemLevelCallNumberSuffix: callNumberData.callNumberSuffix,
          volume: itemEnum.volume,
          enumeration: itemEnum.enumeration,
          chronology: itemEnum.chronology,
          copyNumber: itemEnum.copyNumber,
        });
      }
      CallNumberBrowseSettings.assignCallNumberTypesViaApi({
        name: BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL,
        callNumberTypes: [],
      });
    });

    after('Clean up', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      InventoryInstances.deleteFullInstancesByTitleViaApi(instanceTitle);
      CallNumberBrowseSettings.assignCallNumberTypesViaApi({
        name: BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL,
        callNumberTypes: [],
      });
    });

    it(
      'C651491 Browse for same call numbers with different copy numbers (enumeration data) which belongs to same instance (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C651491'] },
      () => {
        cy.login(testData.user.username, testData.user.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventoryInstances.waitContentLoading();
        // Switch to Browse tab and select Call numbers (all)
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.selectBrowseOption(BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL);
        BrowseCallNumber.waitForCallNumberToAppear(browseQuery);
        InventorySearchAndFilter.fillInBrowseSearch(browseQuery);

        InventorySearchAndFilter.clickSearch();
        InventorySearchAndFilter.verifyBrowseInventorySearchResults({
          records: [{ callNumber: expectedBrowseRow }],
        });
        BrowseCallNumber.checkNumberOfTitlesForRow(expectedBrowseRow, '1');
        BrowseCallNumber.checkNumberOfTitlesForRow(expectedBrowseRow, instanceTitle);
      },
    );
  });
});
