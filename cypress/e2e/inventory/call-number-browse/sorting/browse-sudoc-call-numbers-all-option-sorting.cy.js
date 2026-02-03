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
      const randomDigits = randomFourDigitNumber();
      const instanceTitle = `AT_C477559_FolioInstance_${randomPostfix}`;
      let holdingsId;
      let locationId;
      let loanTypeId;
      let materialTypeId;
      let tempUser;
      let sudocTypeId;
      // Call number data as per test case
      const callNumbers = [
        {
          prefix: '',
          callNumber: `L${randomDigits}7.2:Oc1/2`,
          volume: '',
          enumeration: '',
          chronology: '',
          copyNumber: '',
          suffix: '/conversion',
        },
        {
          prefix: 'AudCD',
          callNumber: `Y4.F${randomDigits}/2:Af8/12`,
          volume: 'v.3',
          enumeration: 'no. 3',
          chronology: '2005',
          copyNumber: 'c. 3',
          suffix: 'AST',
        },
        {
          prefix: '',
          callNumber: `T${randomDigits}3.19/2:P94/2`,
          volume: 'vol. 1',
          enumeration: 'n. 2',
          chronology: '1995-2005',
          copyNumber: 'copy 4',
          suffix: 'CD',
        },
        {
          prefix: '',
          callNumber: `L${randomDigits}6.202:F15/990`,
          volume: 'v3',
          enumeration: 'n1',
          chronology: '',
          copyNumber: 'c.1',
          suffix: '',
        },
        {
          prefix: 'OVER',
          callNumber: `J${randomDigits}.2:D84/982`,
          volume: '',
          enumeration: 'no.02',
          chronology: '2011',
          copyNumber: 'c.33',
          suffix: '',
        },
        {
          prefix: '',
          callNumber: `T${randomDigits}4.19/2:P94/2`,
          volume: '',
          enumeration: '',
          chronology: '',
          copyNumber: '',
          suffix: '',
        },
        {
          prefix: '',
          callNumber: `L${randomDigits}6.202:F15/991`,
          volume: '',
          enumeration: '',
          chronology: '',
          copyNumber: '',
          suffix: '',
        },
        {
          prefix: '',
          callNumber: `WA ${randomDigits}.5 B5315 2018`,
          volume: '',
          enumeration: '',
          chronology: '',
          copyNumber: '',
          suffix: '',
        },
        {
          prefix: '',
          callNumber: `J${randomDigits}.2:D84/2`,
          volume: '',
          enumeration: '',
          chronology: '',
          copyNumber: '',
          suffix: '',
        },
        {
          prefix: '',
          callNumber: `T${randomDigits}2.19/2:P94/2`,
          volume: '',
          enumeration: '',
          chronology: '',
          copyNumber: '',
          suffix: '',
        },
        {
          prefix: '',
          callNumber: `T${randomDigits}2.19:M54`,
          volume: '',
          enumeration: '',
          chronology: '',
          copyNumber: '',
          suffix: '',
        },
        {
          prefix: '',
          callNumber: `L${randomDigits}6.202:F15/2`,
          volume: '',
          enumeration: '',
          chronology: '',
          copyNumber: '',
          suffix: '',
        },
        {
          prefix: '',
          callNumber: `T${randomDigits}2.19:M54/990`,
          volume: '',
          enumeration: '',
          chronology: '',
          copyNumber: '',
          suffix: '',
        },
      ];
      // Expected display order for each query
      const expectedJ29Rows = [`J${randomDigits}.2:D84/2`, `OVER J${randomDigits}.2:D84/982`];
      const expectedL36Rows = [
        `L${randomDigits}6.202:F15/2`,
        `L${randomDigits}6.202:F15/990`,
        `L${randomDigits}6.202:F15/991`,
        `L${randomDigits}7.2:Oc1/2 /conversion`,
      ];
      const expectedT22Rows = [
        `T${randomDigits}2.19/2:P94/2`,
        `T${randomDigits}2.19:M54`,
        `T${randomDigits}2.19:M54/990`,
        `T${randomDigits}3.19/2:P94/2 CD`,
        `T${randomDigits}4.19/2:P94/2`,
      ];
      const expectedWARows = [`WA ${randomDigits}.5 B5315 2018`];
      const expectedY4Rows = [`AudCD Y4.F${randomDigits}/2:Af8/12 AST`];
      const expectedValuesInApi = callNumbers.map(
        (cn) => `${cn.callNumber}${cn.suffix ? ' ' + cn.suffix : ''}`,
      );

      before('Create data and user', () => {
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C477559');
        cy.then(() => {
          CallNumberTypes.getCallNumberTypesViaAPI().then((res) => {
            sudocTypeId = res.find((t) => t.name === CALL_NUMBER_TYPE_NAMES.SUDOC).id;
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
                itemLevelCallNumberTypeId: sudocTypeId,
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
              callNumberTypes: [sudocTypeId],
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
        'C477559 SuDoc call numbers are sorted alphabetically when used "Call numbers (all)" browse option (spitfire)',
        { tags: ['criticalPathFlaky', 'spitfire', 'nonParallel', 'C477559'] },
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
          cy.ifConsortia(true, () => {
            InventorySearchAndFilter.toggleAccordionByName('Shared');
            InventorySearchAndFilter.selectOptionInExpandedFilter('Shared', 'No');
            InventorySearchAndFilter.verifyBrowseResultListExists();
          });
          // Step 1: J29.2:D84
          InventorySearchAndFilter.fillInBrowseSearch(`J${randomDigits}.2:D84`);
          InventorySearchAndFilter.clickSearch();
          BrowseCallNumber.resultRowsIsInRequiredOder([
            `J${randomDigits}.2:D84would be here`,
            ...expectedJ29Rows,
          ]);
          // Step 2: L36
          InventorySearchAndFilter.fillInBrowseSearch(`L${randomDigits}`);
          InventorySearchAndFilter.clickSearch();
          BrowseCallNumber.resultRowsIsInRequiredOder([
            `L${randomDigits}would be here`,
            ...expectedL36Rows,
          ]);
          // Step 3: t22
          InventorySearchAndFilter.fillInBrowseSearch(`t${randomDigits}`);
          InventorySearchAndFilter.clickSearch();
          BrowseCallNumber.resultRowsIsInRequiredOder([
            `t${randomDigits}would be here`,
            ...expectedT22Rows,
          ]);
          // Step 4: WA 102
          InventorySearchAndFilter.fillInBrowseSearch(`WA ${randomDigits}`);
          InventorySearchAndFilter.clickSearch();
          BrowseCallNumber.resultRowsIsInRequiredOder([
            `WA ${randomDigits}would be here`,
            ...expectedWARows,
          ]);
          // Step 5: Y4.F76/2:Af8/12
          InventorySearchAndFilter.fillInBrowseSearch(`Y4.F${randomDigits}/2:Af8/12`);
          InventorySearchAndFilter.clickSearch();
          BrowseCallNumber.resultRowsIsInRequiredOder([
            `Y4.F${randomDigits}/2:Af8/12would be here`,
            ...expectedY4Rows,
          ]);
        },
      );
    });
  });
});
