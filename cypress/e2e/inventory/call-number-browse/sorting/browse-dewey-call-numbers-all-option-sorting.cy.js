import Permissions from '../../../../support/dictionary/permissions';
import Users from '../../../../support/fragments/users/users';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import getRandomPostfix, { randomFourDigitNumber } from '../../../../support/utils/stringTools';
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
    const randomDigits = randomFourDigitNumber();
    const instanceTitle = `AT_C477558_FolioInstance_${randomPostfix}`;
    const callNumberType = CALL_NUMBER_TYPE_NAMES.DEWAY_DECIMAL;
    // Call number data as per test case
    const callNumbers = [
      {
        prefix: '',
        callNumber: `${randomDigits}1.2`,
        volume: 'v. 1',
        enumeration: 'n1',
        chronology: '2001',
        copyNumber: '',
        suffix: '',
      },
      {
        prefix: 'ASTM',
        callNumber: `${randomDigits}1.042`,
        volume: 'v.3',
        enumeration: 'no. 5',
        chronology: '1888',
        copyNumber: 'c. 1',
        suffix: 'CD',
      },
      {
        prefix: '',
        callNumber: `${randomDigits}1.01`,
        volume: 'v. 2',
        enumeration: 'no. 3',
        chronology: '1995',
        copyNumber: 'c.2',
        suffix: 'AudCD',
      },
      {
        prefix: 'Over',
        callNumber: `${randomDigits}1.016`,
        volume: '',
        enumeration: 'n.3',
        chronology: '1900-2000',
        copyNumber: 'copy 2',
        suffix: '',
      },
      {
        prefix: 'win',
        callNumber: `${randomDigits}1.1`,
        volume: 'vol. 15',
        enumeration: '',
        chronology: '',
        copyNumber: 'c. 3',
        suffix: '2010',
      },
      {
        prefix: '',
        callNumber: `${randomDigits}1`,
        volume: '',
        enumeration: '',
        chronology: '',
        copyNumber: '',
        suffix: '',
      },
      {
        prefix: '',
        callNumber: `${randomDigits}1.041`,
        volume: '',
        enumeration: '',
        chronology: '',
        copyNumber: '',
        suffix: '',
      },
      {
        prefix: '',
        callNumber: `${randomDigits}1.198`,
        volume: '',
        enumeration: '',
        chronology: '',
        copyNumber: '',
        suffix: '',
      },
      {
        prefix: '',
        callNumber: `${randomDigits}1.0413`,
        volume: '',
        enumeration: '',
        chronology: '',
        copyNumber: '',
        suffix: '',
      },
      {
        prefix: '',
        callNumber: `${randomDigits}1.02`,
        volume: '',
        enumeration: '',
        chronology: '',
        copyNumber: '',
        suffix: '',
      },
    ];
    const expectedValuesInApi = callNumbers.map(
      (cn) => `${cn.callNumber}${cn.suffix ? ` ${cn.suffix}` : ''}`,
    );
    // Expected display order for both queries
    const expectedRowsSorted = [
      `${randomDigits}1`,
      `${randomDigits}1.01 AudCD`,
      `Over ${randomDigits}1.016`,
      `${randomDigits}1.02`,
      `${randomDigits}1.041`,
      `${randomDigits}1.0413`,
      `ASTM ${randomDigits}1.042 CD`,
      `win ${randomDigits}1.1 2010`,
      `${randomDigits}1.198`,
      `${randomDigits}1.2`,
    ];
    const nonExistentCallNumber = `${randomDigits}0.999999`;
    let holdingsId;
    let callNumberTypeId;
    let locationId;
    let loanTypeId;
    let materialTypeId;
    let tempUser;

    before('Create data and user', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C477558');
      cy.then(() => {
        CallNumberTypes.getCallNumberTypesViaAPI().then((res) => {
          callNumberTypeId = res.find((t) => t.name === callNumberType).id;
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
          const instanceData = InventoryInstances.generateFolioInstances({
            instanceTitlePrefix: instanceTitle,
            holdingsCount: 1,
          })[0];
          InventoryInstances.createFolioInstancesViaApi({
            folioInstances: [instanceData],
            location: { id: locationId },
          }).then((createdInstance) => {
            holdingsId = createdInstance.holdings[0].id;
          });
        })
        .then(() => {
          cy.getAdminToken();
          for (let i = 0; i < callNumbers.length; i++) {
            const cn = callNumbers[i];
            ItemRecordNew.createViaApi({
              holdingsId,
              materialTypeId,
              permanentLoanTypeId: loanTypeId,
              itemLevelCallNumber: cn.callNumber,
              itemLevelCallNumberTypeId: callNumberTypeId,
              itemLevelCallNumberPrefix: cn.prefix,
              itemLevelCallNumberSuffix: cn.suffix,
              volume: cn.volume,
              enumeration: cn.enumeration,
              chronology: cn.chronology,
              copyNumber: cn.copyNumber,
            });
          }
          cy.createTempUser([Permissions.inventoryAll.gui]).then((userProps) => {
            tempUser = userProps;
          });
          CallNumberBrowseSettings.assignCallNumberTypesViaApi({
            name: BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL,
            callNumberTypes: [callNumberTypeId],
          });
        });
    });

    after('Clean up', () => {
      cy.getAdminToken();
      Users.deleteViaApi(tempUser.userId);
      InventoryInstances.deleteFullInstancesByTitleViaApi(instanceTitle);
      CallNumberBrowseSettings.assignCallNumberTypesViaApi({
        name: BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL,
        callNumberTypes: [],
      });
    });

    it(
      'C477558 Dewey call numbers are sorted alphabetically using "Call numbers (all)" browse option (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'nonParallel', 'C477558'] },
      () => {
        cy.login(tempUser.username, tempUser.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventoryInstances.waitContentLoading();
        // Switch to Browse tab and select Call numbers (all)
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.selectBrowseOption(BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL);
        // Step 1: Exact match query
        expectedValuesInApi.forEach((value) => {
          BrowseCallNumber.waitForCallNumberToAppear(value);
        });
        InventorySearchAndFilter.fillInBrowseSearch(expectedRowsSorted[0]);
        InventorySearchAndFilter.clickSearch();
        BrowseCallNumber.valueInResultTableIsHighlighted(expectedRowsSorted[0]);
        BrowseCallNumber.resultRowsIsInRequiredOder(expectedRowsSorted);
        // Step 2: Non-exact match query
        InventorySearchAndFilter.fillInBrowseSearch(nonExistentCallNumber);
        InventorySearchAndFilter.clickSearch();
        // The first row is a non-exact match placeholder, then the same expectedRows
        BrowseCallNumber.resultRowsIsInRequiredOder([
          `${nonExistentCallNumber}would be here`,
          ...expectedRowsSorted,
        ]);
      },
    );
  });
});
