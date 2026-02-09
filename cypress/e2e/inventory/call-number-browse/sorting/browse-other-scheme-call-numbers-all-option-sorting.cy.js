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
    describe('Sorting', () => {
      const randomPostfix = getRandomPostfix();
      const randomLetters = getRandomLetters(7).toUpperCase();
      const instanceTitle = `AT_C477560_FolioInstance_${randomPostfix}`;
      let holdingsId;
      let locationId;
      let loanTypeId;
      let materialTypeId;
      let tempUser;
      let otherSchemeTypeId;
      let udcTypeId;
      // Call number data as per test case
      const callNumbers = [
        {
          prefix: 'AST',
          callNumber: `FIC ${randomLetters}WAL`,
          volume: 'v. 3',
          enumeration: 'no. 2',
          chronology: '1965',
          copyNumber: 'c. 2',
          suffix: 'CD',
        },
        {
          prefix: '',
          callNumber: `B ${randomLetters}WASHINGTON`,
          volume: 'vol. 2',
          enumeration: 'n. 1',
          chronology: '',
          copyNumber: '',
          suffix: '1999',
        },
        {
          prefix: 'AudCD',
          callNumber: `FIC ${randomLetters}CLE`,
          volume: '',
          enumeration: 'no.3',
          chronology: '',
          copyNumber: 'co. 1',
          suffix: '',
        },
        {
          prefix: '',
          callNumber: `B ${randomLetters}JORDAN`,
          volume: 'v. 04',
          enumeration: '',
          chronology: '1975',
          copyNumber: '',
          suffix: 'DVD',
        },
        {
          prefix: '',
          callNumber: `SC ${randomLetters}BRU`,
          volume: '',
          enumeration: 'en. 1',
          chronology: '',
          copyNumber: 'copy 31',
          suffix: '',
        },
        {
          prefix: '',
          callNumber: `SC ${randomLetters}VIV`,
          volume: '',
          enumeration: '',
          chronology: '',
          copyNumber: '',
          suffix: '',
        },
        {
          prefix: '',
          callNumber: `FIC ${randomLetters}DAN`,
          volume: '',
          enumeration: '',
          chronology: '',
          copyNumber: '',
          suffix: '',
        },
        {
          prefix: '',
          callNumber: `DVD ${randomLetters}F GON`,
          volume: '',
          enumeration: '',
          chronology: '',
          copyNumber: '',
          suffix: '',
        },
        {
          prefix: '',
          callNumber: `B ${randomLetters}OBAMA`,
          volume: '',
          enumeration: '',
          chronology: '',
          copyNumber: '',
          suffix: '',
        },
        {
          prefix: '',
          callNumber: `SC ${randomLetters}DAH`,
          volume: '',
          enumeration: '',
          chronology: '',
          copyNumber: '',
          suffix: '',
        },
      ];
      // Expected display order for each query
      const expectedBRows = [
        `B ${randomLetters}JORDAN DVD`,
        `B ${randomLetters}OBAMA`,
        `B ${randomLetters}WASHINGTON 1999`,
      ];
      const expectedDVDFRows = [`DVD ${randomLetters}F GON`];
      const expectedFICRows = [
        `AudCD FIC ${randomLetters}CLE`,
        `FIC ${randomLetters}DAN`,
        `AST FIC ${randomLetters}WAL CD`,
      ];
      const expectedSCRows = [
        `SC ${randomLetters}BRU`,
        `SC ${randomLetters}DAH`,
        `SC ${randomLetters}VIV`,
      ];
      const expectedValuesInApi = callNumbers.map(
        (cn) => `${cn.callNumber}${cn.suffix ? ' ' + cn.suffix : ''}`,
      );

      before('Create data and user', () => {
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C477560');
        cy.then(() => {
          CallNumberTypes.getCallNumberTypesViaAPI().then((res) => {
            otherSchemeTypeId = res.find((t) => t.name === CALL_NUMBER_TYPE_NAMES.OTHER_SCHEME).id;
            udcTypeId = res.find((t) => t.name === CALL_NUMBER_TYPE_NAMES.UDC).id;
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
                itemLevelCallNumberTypeId: otherSchemeTypeId,
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
              callNumberTypes: [otherSchemeTypeId, udcTypeId],
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
        'C477560 Other scheme call numbers are sorted alphabetically using "Call numbers (all)" browse option (spitfire)',
        { tags: ['criticalPathFlaky', 'spitfire', 'nonParallel', 'C477560'] },
        () => {
          cy.waitForAuthRefresh(() => {
            cy.login(tempUser.username, tempUser.password);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventoryInstances.waitContentLoading();
          });
          // Switch to Browse tab and select Call numbers (all)
          InventorySearchAndFilter.switchToBrowseTab();
          InventorySearchAndFilter.selectBrowseOption(BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL);
          expectedValuesInApi.forEach((value) => {
            BrowseCallNumber.waitForCallNumberToAppear(value);
          });
          // Step 1: B A
          InventorySearchAndFilter.fillInBrowseSearch(`B ${randomLetters}`);
          InventorySearchAndFilter.clickSearch();
          BrowseCallNumber.resultRowsIsInRequiredOder([
            `B ${randomLetters}would be here`,
            ...expectedBRows,
          ]);
          // Step 2: DVD F
          InventorySearchAndFilter.fillInBrowseSearch(`DVD ${randomLetters}F`);
          InventorySearchAndFilter.clickSearch();
          BrowseCallNumber.resultRowsIsInRequiredOder([
            `DVD ${randomLetters}Fwould be here`,
            ...expectedDVDFRows,
          ]);
          // Step 3: fic 1
          InventorySearchAndFilter.fillInBrowseSearch(`fic ${randomLetters}`);
          InventorySearchAndFilter.clickSearch();
          BrowseCallNumber.resultRowsIsInRequiredOder([
            `fic ${randomLetters}would be here`,
            ...expectedFICRows,
          ]);
          // Step 4: SC
          InventorySearchAndFilter.fillInBrowseSearch(`SC ${randomLetters}`);
          InventorySearchAndFilter.clickSearch();
          BrowseCallNumber.resultRowsIsInRequiredOder([
            `SC ${randomLetters}would be here`,
            ...expectedSCRows,
          ]);
        },
      );
    });
  });
});
