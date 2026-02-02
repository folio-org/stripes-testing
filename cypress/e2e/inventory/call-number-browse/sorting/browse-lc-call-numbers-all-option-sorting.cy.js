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
    describe('Sorting', () => {
      const randomPostfix = getRandomPostfix();
      const fourDigits = randomFourDigitNumber();
      const randomDigits = `${fourDigits}${fourDigits}`;
      const instanceTitle = `AT_C477537_FolioInstance_${randomPostfix}`;
      const callNumberTypeLC = CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS;
      const callNumberTypeNLM = CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_MEDICINE;
      // Call number data as per test case
      const callNumbers = [
        {
          prefix: '',
          callNumber: `PR${randomDigits}9.3 1920 .L33 1475 .A6`,
          volume: '',
          enumeration: '',
          chronology: '',
          copyNumber: '',
          suffix: '',
        },
        {
          prefix: '',
          callNumber: `PQ${randomDigits}0.21.R57 V5 1992`,
          volume: '',
          enumeration: '',
          chronology: '',
          copyNumber: '',
          suffix: '',
        },
        {
          prefix: '',
          callNumber: `PR${randomDigits} .L33 1990`,
          volume: '',
          enumeration: '',
          chronology: '',
          copyNumber: '',
          suffix: '',
        },
        {
          prefix: '',
          callNumber: `PR${randomDigits}9.48 .B3`,
          volume: '',
          enumeration: '',
          chronology: '',
          copyNumber: '',
          suffix: '',
        },
        {
          prefix: '',
          callNumber: `PN${randomDigits} .A6 1999`,
          volume: '',
          enumeration: '',
          chronology: '',
          copyNumber: '',
          suffix: 'CD',
        },
        {
          prefix: '',
          callNumber: `PN${randomDigits} .A6`,
          volume: 'v. 3',
          enumeration: 'no. 2',
          chronology: '1999',
          copyNumber: '',
          suffix: '',
        },
        {
          prefix: '',
          callNumber: `PN${randomDigits} .A690`,
          volume: '',
          enumeration: 'no. 2',
          chronology: '',
          copyNumber: '',
          suffix: '',
        },
        {
          prefix: 'Wordsworth',
          callNumber: `PN${randomDigits} .A691`,
          volume: '',
          enumeration: 'no. 2',
          chronology: '1922',
          copyNumber: '2',
          suffix: '',
        },
        {
          prefix: 'Over',
          callNumber: `PN${randomDigits} .A692`,
          volume: 'v.1',
          enumeration: 'no. 1',
          chronology: '',
          copyNumber: '',
          suffix: '+',
        },
        {
          prefix: '',
          callNumber: `PN${randomDigits} .A690`,
          volume: '',
          enumeration: '',
          chronology: '1922',
          copyNumber: '',
          suffix: '',
        },
      ];
      const expectedValuesInApi = callNumbers.map(
        (cn) => `${cn.callNumber}${cn.suffix ? ` ${cn.suffix}` : ''}`,
      );
      // Expected display order for each query
      const expectedPNRows = [
        `PN${randomDigits} .A6`,
        `PN${randomDigits} .A6 1999 CD`,
        `PN${randomDigits} .A690`,
        `Wordsworth PN${randomDigits} .A691`,
        `Over PN${randomDigits} .A692 +`,
      ];
      const expectedPQRows = [`PQ${randomDigits}0.21.R57 V5 1992`];
      const expectedPRRows = [
        `PR${randomDigits} .L33 1990`,
        `PR${randomDigits}9.3 1920 .L33 1475 .A6`,
        `PR${randomDigits}9.48 .B3`,
      ];
      let holdingsId;
      let callNumberTypeLCId;
      let callNumberTypeNLMId;
      let locationId;
      let loanTypeId;
      let materialTypeId;
      let tempUser;

      before('Create data and user', () => {
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C477537');
        cy.then(() => {
          CallNumberTypes.getCallNumberTypesViaAPI().then((res) => {
            callNumberTypeLCId = res.find((t) => t.name === callNumberTypeLC).id;
            callNumberTypeNLMId = res.find((t) => t.name === callNumberTypeNLM).id;
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
                itemLevelCallNumberTypeId: callNumberTypeLCId,
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
              callNumberTypes: [callNumberTypeLCId, callNumberTypeNLMId],
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
        'C477537 LC call numbers are sorted alphabetically using "Call numbers (all)" browse option (spitfire)',
        { tags: ['smokeFlaky', 'spitfire', 'nonParallel', 'C477537'] },
        () => {
          cy.login(tempUser.username, tempUser.password);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventoryInstances.waitContentLoading();
          // Switch to Browse tab and select Call numbers (all)
          InventorySearchAndFilter.switchToBrowseTab();
          InventorySearchAndFilter.selectBrowseOption(BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL);
          expectedValuesInApi.forEach((value) => {
            BrowseCallNumber.waitForCallNumberToAppear(value);
          });
          // Step 1: PN2
          InventorySearchAndFilter.fillInBrowseSearch(`PN${randomDigits}`);
          InventorySearchAndFilter.clickSearch();
          BrowseCallNumber.resultRowsIsInRequiredOder([
            `PN${randomDigits}would be here`,
            ...expectedPNRows,
          ]);
          // Step 2: PQ8550.2
          InventorySearchAndFilter.fillInBrowseSearch(`PQ${randomDigits}0.2`);
          InventorySearchAndFilter.clickSearch();
          BrowseCallNumber.resultRowsIsInRequiredOder([
            `PQ${randomDigits}0.2would be here`,
            ...expectedPQRows,
          ]);
          // Step 3: PR919
          InventorySearchAndFilter.fillInBrowseSearch(`PR${randomDigits}`);
          InventorySearchAndFilter.clickSearch();
          BrowseCallNumber.resultRowsIsInRequiredOder([
            `PR${randomDigits}would be here`,
            ...expectedPRRows,
          ]);
        },
      );
    });
  });
});
