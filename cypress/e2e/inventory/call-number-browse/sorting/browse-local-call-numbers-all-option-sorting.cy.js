import Permissions from '../../../../support/dictionary/permissions';
import Users from '../../../../support/fragments/users/users';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import getRandomPostfix, { randomFourDigitNumber } from '../../../../support/utils/stringTools';
import { APPLICATION_NAMES, BROWSE_CALL_NUMBER_OPTIONS } from '../../../../support/constants';
import ItemRecordNew from '../../../../support/fragments/inventory/item/itemRecordNew';
import BrowseCallNumber from '../../../../support/fragments/inventory/search/browseCallNumber';
import { CallNumberTypes } from '../../../../support/fragments/settings/inventory/instances/callNumberTypes';
import { CallNumberBrowseSettings } from '../../../../support/fragments/settings/inventory/instances/callNumberBrowse';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    describe('Sorting', () => {
      const randomPostfix = getRandomPostfix();
      const randomDigits = `477563${randomFourDigitNumber()}`;
      const instanceTitle = `AT_C477563_FolioInstance_${randomPostfix}`;
      let localTypeId;
      let holdingsId;
      let locationId;
      let loanTypeId;
      let materialTypeId;
      let tempUser;
      // Call number data as per test case
      const callNumbers = [
        {
          prefix: 'Over',
          callNumber: `SF${randomDigits}3 .D47 1991`,
          volume: 'v. 3',
          enumeration: 'no. 2',
          chronology: '1999',
          copyNumber: 'c. 3',
          suffix: 'CD',
        },
        {
          prefix: '',
          callNumber: `SF${randomDigits}3 .D47`,
          volume: 'vol. 2',
          enumeration: 'n.2',
          chronology: '',
          copyNumber: '',
          suffix: '1992',
        },
        {
          prefix: 'ASTM',
          callNumber: `SF${randomDigits}3 .D47 1994`,
          volume: '',
          enumeration: 'n. 04',
          chronology: '',
          copyNumber: 'copy 67',
          suffix: '',
        },
        {
          prefix: '',
          callNumber: `SF${randomDigits}3 .D47 2000`,
          volume: 'v.2',
          enumeration: '',
          chronology: '1956',
          copyNumber: '',
          suffix: 'DVD',
        },
        {
          prefix: '',
          callNumber: `SF${randomDigits}3 .D47 199`,
          volume: 'v 2',
          enumeration: 'en. 3',
          chronology: '',
          copyNumber: 'c.1',
          suffix: '',
        },
        {
          prefix: '',
          callNumber: `SF${randomDigits}3 .D44 1990`,
          volume: '',
          enumeration: '',
          chronology: '',
          copyNumber: '',
          suffix: '',
        },
        {
          prefix: '',
          callNumber: `SF${randomDigits}4 .D47 1985`,
          volume: '',
          enumeration: '',
          chronology: '',
          copyNumber: '',
          suffix: '',
        },
        {
          prefix: '',
          callNumber: `SK${randomDigits}3 .D43 1991`,
          volume: '',
          enumeration: '',
          chronology: '',
          copyNumber: '',
          suffix: '',
        },
        {
          prefix: '',
          callNumber: `SK${randomDigits}3 .D42 1991`,
          volume: '',
          enumeration: '',
          chronology: '',
          copyNumber: '',
          suffix: '',
        },
        {
          prefix: '',
          callNumber: `SK${randomDigits}4 .D47 1991`,
          volume: '',
          enumeration: '',
          chronology: '',
          copyNumber: '',
          suffix: '',
        },
      ];
      // Expected display order for each query
      const expectedSFRows = [
        `SF${randomDigits}3 .D44 1990`,
        `SF${randomDigits}3 .D47 199`,
        `Over SF${randomDigits}3 .D47 1991 CD`,
        `SF${randomDigits}3 .D47 1992`,
        `ASTM SF${randomDigits}3 .D47 1994`,
        `SF${randomDigits}3 .D47 2000 DVD`,
        `SF${randomDigits}4 .D47 1985`,
      ];
      const expectedSKRows = [
        `SK${randomDigits}3 .D42 1991`,
        `SK${randomDigits}3 .D43 1991`,
        `SK${randomDigits}4 .D47 1991`,
      ];
      const expectedValuesInApi = callNumbers.map(
        (cn) => `${cn.callNumber}${cn.suffix ? ' ' + cn.suffix : ''}`,
      );

      before('Create data and user', () => {
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C477563');
        cy.then(() => {
          CallNumberTypes.createCallNumberTypeViaApi({ name: `LocalType_${randomPostfix}` }).then(
            (id) => {
              localTypeId = id;
            },
          );
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
                itemLevelCallNumberTypeId: localTypeId,
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
              callNumberTypes: [],
            });
          });
      });

      after('Clean up', () => {
        cy.getAdminToken();
        Users.deleteViaApi(tempUser.userId);
        InventoryInstances.deleteFullInstancesByTitleViaApi(instanceTitle);
        CallNumberTypes.deleteLocalCallNumberTypeViaApi(localTypeId);
        CallNumberBrowseSettings.assignCallNumberTypesViaApi({
          name: BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL,
          callNumberTypes: [],
        });
      });

      it(
        'C477563 Local call numbers are sorted alphabetically using "Call numbers (all)" browse option (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'nonParallel', 'C477563'] },
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
          // Step 1: SF453
          InventorySearchAndFilter.fillInBrowseSearch(`SF${randomDigits}3`);
          InventorySearchAndFilter.clickSearch();
          BrowseCallNumber.resultRowsIsInRequiredOder([
            `SF${randomDigits}3would be here`,
            ...expectedSFRows,
          ]);
          // Step 2: SK453
          InventorySearchAndFilter.fillInBrowseSearch(`SK${randomDigits}3`);
          InventorySearchAndFilter.clickSearch();
          BrowseCallNumber.resultRowsIsInRequiredOder([
            `SK${randomDigits}3would be here`,
            ...expectedSKRows,
          ]);
        },
      );
    });
  });
});
