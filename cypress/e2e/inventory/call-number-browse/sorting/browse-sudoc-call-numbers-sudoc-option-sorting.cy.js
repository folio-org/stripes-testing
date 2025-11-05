import Permissions from '../../../../support/dictionary/permissions';
import Users from '../../../../support/fragments/users/users';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import {
  APPLICATION_NAMES,
  CALL_NUMBER_TYPE_NAMES,
  BROWSE_CALL_NUMBER_OPTIONS,
} from '../../../../support/constants';
import ItemRecordNew from '../../../../support/fragments/inventory/item/itemRecordNew';
import BrowseCallNumber from '../../../../support/fragments/inventory/search/browseCallNumber';
import { CallNumberTypes } from '../../../../support/fragments/settings/inventory/instances/callNumberTypes';
import {
  CallNumberBrowseSettings,
  callNumbersIds,
} from '../../../../support/fragments/settings/inventory/instances/callNumberBrowse';
import getRandomPostfix, { getRandomLetters } from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    describe('Sorting', () => {
      const randomPostfix = getRandomPostfix();
      const randomLetters = getRandomLetters(7);
      const sudocTypeCode = callNumbersIds[BROWSE_CALL_NUMBER_OPTIONS.SUPERINTENDENT_OF_DOCUMENTS];
      const instanceTitle = `AT_C400668_FolioInstance_${randomPostfix}`;
      const callNumbers = [
        {
          prefix: '',
          callNumber: `${randomLetters}L37.2:Oc1/2`,
          volume: '',
          enumeration: '',
          chronology: '',
          copyNumber: '',
          suffix: '/conversion',
        },
        {
          prefix: 'AudCD',
          callNumber: `${randomLetters}Y4.F76/2:Af8/12`,
          volume: 'v.3',
          enumeration: 'no. 3',
          chronology: '2005',
          copyNumber: 'c. 3',
          suffix: 'AST',
        },
        {
          prefix: '',
          callNumber: `${randomLetters}T23.19/2:P94/2`,
          volume: 'vol. 1',
          enumeration: 'n. 2',
          chronology: '1995-2005',
          copyNumber: 'copy 4',
          suffix: 'CD',
        },
        {
          prefix: '',
          callNumber: `${randomLetters}L36.202:F15/990`,
          volume: 'v3',
          enumeration: 'n1',
          chronology: '',
          copyNumber: 'c.1',
          suffix: '',
        },
        {
          prefix: 'OVER',
          callNumber: `${randomLetters}J29.2:D84/982`,
          volume: '',
          enumeration: 'no.02',
          chronology: '2011',
          copyNumber: 'c.33',
          suffix: '',
        },
        {
          prefix: '',
          callNumber: `${randomLetters}T24.19/2:P94/2`,
          volume: '',
          enumeration: '',
          chronology: '',
          copyNumber: '',
          suffix: '',
        },
        {
          prefix: '',
          callNumber: `${randomLetters}L36.202:F15/991`,
          volume: '',
          enumeration: '',
          chronology: '',
          copyNumber: '',
          suffix: '',
        },
        {
          prefix: '',
          callNumber: `${randomLetters}WA 102.5 B5315 2018`,
          volume: '',
          enumeration: '',
          chronology: '',
          copyNumber: '',
          suffix: '',
        },
        {
          prefix: '',
          callNumber: `${randomLetters}J29.2:D84/2`,
          volume: '',
          enumeration: '',
          chronology: '',
          copyNumber: '',
          suffix: '',
        },
        {
          prefix: '',
          callNumber: `${randomLetters}T22.19/2:P94/2`,
          volume: '',
          enumeration: '',
          chronology: '',
          copyNumber: '',
          suffix: '',
        },
        {
          prefix: '',
          callNumber: `${randomLetters}T22.19:M54`,
          volume: '',
          enumeration: '',
          chronology: '',
          copyNumber: '',
          suffix: '',
        },
        {
          prefix: '',
          callNumber: `${randomLetters}L36.202:F15/2`,
          volume: '',
          enumeration: '',
          chronology: '',
          copyNumber: '',
          suffix: '',
        },
        {
          prefix: '',
          callNumber: `${randomLetters}T22.19:M54/990`,
          volume: '',
          enumeration: '',
          chronology: '',
          copyNumber: '',
          suffix: '',
        },
      ];
      const callNumberValuesInApi = callNumbers.map(
        (cn) => `${cn.callNumber}${cn.suffix ? ` ${cn.suffix}` : ''}`,
      );
      const expectedOrder = [
        `OVER ${randomLetters}J29.2:D84/982`,
        `${randomLetters}J29.2:D84/2`,
        `${randomLetters}L36.202:F15/990`,
        `${randomLetters}L36.202:F15/991`,
        `${randomLetters}L36.202:F15/2`,
        `${randomLetters}L37.2:Oc1/2 /conversion`,
        `${randomLetters}T22.19:M54`,
        `${randomLetters}T22.19:M54/990`,
        `${randomLetters}T22.19/2:P94/2`,
        `${randomLetters}T23.19/2:P94/2 CD`,
        `${randomLetters}T24.19/2:P94/2`,
        `${randomLetters}WA 102.5 B5315 2018`,
        `AudCD ${randomLetters}Y4.F76/2:Af8/12 AST`,
      ];
      let holdingsId;
      let locationId;
      let loanTypeId;
      let materialTypeId;
      let tempUser;
      let sudocTypeId;

      before('Create data and user', () => {
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C400668_');
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
        }).then(() => {
          // Create one instance and one holdings
          const instanceData = InventoryInstances.generateFolioInstances({
            instanceTitlePrefix: instanceTitle,
            holdingsCount: 1,
          })[0];
          InventoryInstances.createFolioInstancesViaApi({
            folioInstances: [instanceData],
            location: { id: locationId },
          }).then((createdInstance) => {
            holdingsId = createdInstance.holdings[0].id;
            // Create all items under this holdings
            callNumbers.forEach((cn) => {
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
            });
          });
          cy.createTempUser([Permissions.inventoryAll.gui]).then((userProps) => {
            tempUser = userProps;
          });
          CallNumberBrowseSettings.assignCallNumberTypesViaApi({
            name: BROWSE_CALL_NUMBER_OPTIONS.SUPERINTENDENT_OF_DOCUMENTS,
            callNumberTypes: [sudocTypeId],
          });
        });
      });

      after('Clean up', () => {
        cy.getAdminToken();
        CallNumberBrowseSettings.assignCallNumberTypesViaApi({
          name: BROWSE_CALL_NUMBER_OPTIONS.SUPERINTENDENT_OF_DOCUMENTS,
          callNumberTypes: [],
        });
        Users.deleteViaApi(tempUser.userId);
        InventoryInstances.deleteFullInstancesByTitleViaApi(instanceTitle);
      });

      it(
        'C400668 Call numbers are sorted by "SuDoc" type when using "Superintendent of Documents classification" browse option',
        { tags: ['criticalPathFlaky', 'spitfire', 'nonParallel', 'C400668'] },
        () => {
          cy.login(tempUser.username, tempUser.password);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventoryInstances.waitContentLoading();
          InventorySearchAndFilter.switchToBrowseTab();
          InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
            BROWSE_CALL_NUMBER_OPTIONS.SUPERINTENDENT_OF_DOCUMENTS,
          );
          callNumberValuesInApi.forEach((callNumber) => {
            BrowseCallNumber.waitForCallNumberToAppear(callNumber, true, sudocTypeCode);
          });
          InventorySearchAndFilter.fillInBrowseSearch(expectedOrder[1]);
          InventorySearchAndFilter.clickSearch();
          BrowseCallNumber.valueInResultTableIsHighlighted(expectedOrder[1]);
          BrowseCallNumber.resultRowsIsInRequiredOder(expectedOrder);
        },
      );
    });
  });
});
