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
  ITEM_STATUS_NAMES,
} from '../../../../support/constants';
import BrowseCallNumber from '../../../../support/fragments/inventory/search/browseCallNumber';
import { CallNumberTypes } from '../../../../support/fragments/settings/inventory/instances/callNumberTypes';
import { CallNumberBrowseSettings } from '../../../../support/fragments/settings/inventory/instances/callNumberBrowse';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    describe('Sorting', () => {
      const randomPostfix = getRandomPostfix();
      const randomDigits = randomFourDigitNumber();
      const instanceTitles = [
        `AT_C477536_MarcBibInstance_1_${randomPostfix}`,
        `AT_C477536_MarcBibInstance_2_${randomPostfix}`,
        `AT_C477536_MarcBibInstance_3_${randomPostfix}`,
        `AT_C477536_MarcBibInstance_4_${randomPostfix}`,
        `AT_C477536_MarcBibInstance_5_${randomPostfix}`,
        `AT_C477536_FolioInstance_6_${randomPostfix}`,
        `AT_C477536_FolioInstance_7_${randomPostfix}`,
        `AT_C477536_FolioInstance_8_${randomPostfix}`,
      ];
      let nlmTypeId;
      let lcTypeId;
      let location;
      let loanTypeId;
      let materialTypeId;
      let tempUser;
      let holdingsFolioSourceId;
      let instanceTypeId;
      const instanceIds = [];

      const recordsData = [
        {
          instanceIndex: 0,
          isMarcInstance: true,
          isMarcHoldings: true,
          hasItem: true,
          callNumberInHoldings: true,
          prefix: '',
          callNumber: `QS ${randomDigits} .GA1 E53`,
          volume: 'v. 3',
          enumeration: 'no. 1',
          chronology: '1984',
          copyNumber: '3',
          suffix: `${randomDigits}`,
        },
        {
          instanceIndex: 1,
          isMarcInstance: true,
          isMarcHoldings: true,
          hasItem: false,
          callNumberInHoldings: true,
          prefix: '',
          callNumber: `QS ${randomDigits} .GA1 E53 ${randomDigits}`, // not displayed
          volume: '',
          enumeration: '',
          chronology: '',
          copyNumber: '',
          suffix: '',
        },
        {
          instanceIndex: 1,
          isMarcInstance: true,
          isMarcHoldings: true,
          hasItem: true,
          callNumberInHoldings: false,
          prefix: '',
          callNumber: `QS ${randomDigits} .GA1 F875d ${randomDigits}`,
          volume: 'v.2',
          enumeration: 'n.2',
          chronology: '1984-1986',
          copyNumber: 'c. 2',
          suffix: 'CD',
        },
        {
          instanceIndex: 2,
          isMarcInstance: true,
          isMarcHoldings: false,
          hasItem: true,
          callNumberInHoldings: true,
          prefix: 'AudCD',
          callNumber: `QS ${randomDigits} .GA1 Q6 ${randomDigits}`,
          volume: '',
          enumeration: 'no.3',
          chronology: '',
          copyNumber: 'c1',
          suffix: '',
        },
        {
          instanceIndex: 2,
          isMarcInstance: true,
          isMarcHoldings: false,
          hasItem: false,
          callNumberInHoldings: true,
          prefix: '',
          callNumber: `QS ${randomDigits} .GA1 Q6 ${randomDigits}`, // not displayed
          volume: '',
          enumeration: '',
          chronology: '',
          copyNumber: '',
          suffix: '',
        },
        {
          instanceIndex: 3,
          isMarcInstance: true,
          isMarcHoldings: false,
          hasItem: true,
          callNumberInHoldings: false,
          prefix: 'Over',
          callNumber: `QS ${randomDigits} .GI8 P235s`,
          volume: '',
          enumeration: 'no.5',
          chronology: '',
          copyNumber: 'c.1',
          suffix: `${randomDigits} year`,
        },
        {
          instanceIndex: 4,
          isMarcInstance: true,
          isMarcHoldings: false,
          hasItem: true,
          callNumberInHoldings: true,
          prefix: '',
          callNumber: `QS ${randomDigits}24 B811m ${randomDigits}`,
          volume: 'vol. 1',
          enumeration: 'N. 01',
          chronology: '',
          copyNumber: '',
          suffix: 'DVD',
        },
        {
          instanceIndex: 4,
          isMarcInstance: true,
          isMarcHoldings: false,
          hasItem: true,
          callNumberInHoldings: false,
          prefix: 'Win',
          callNumber: `QT ${randomDigits} B736 ${randomDigits}3`,
          volume: 'vol. 2',
          enumeration: 'no.4',
          chronology: '1995',
          copyNumber: 'copy 2',
          suffix: 'ast',
        },
        {
          instanceIndex: 5,
          isMarcInstance: false,
          isMarcHoldings: false,
          hasItem: true,
          callNumberInHoldings: true,
          prefix: '',
          callNumber: `QT ${randomDigits} B736 ${randomDigits}9`,
          volume: '',
          enumeration: '',
          chronology: '',
          copyNumber: '',
          suffix: '',
        },
        {
          instanceIndex: 5,
          isMarcInstance: false,
          isMarcHoldings: false,
          hasItem: false,
          callNumberInHoldings: true,
          prefix: '',
          callNumber: `QT ${randomDigits} B736 ${randomDigits}9`, // not displayed
          volume: '',
          enumeration: '',
          chronology: '',
          copyNumber: '',
          suffix: '',
        },
        {
          instanceIndex: 6,
          isMarcInstance: false,
          isMarcHoldings: false,
          hasItem: true,
          callNumberInHoldings: false,
          prefix: '',
          callNumber: `YX ${randomDigits}.5 B5315 ${randomDigits}`,
          volume: '',
          enumeration: '',
          chronology: '',
          copyNumber: '',
          suffix: '',
        },
        {
          instanceIndex: 7,
          isMarcInstance: false,
          isMarcHoldings: false,
          hasItem: true,
          callNumberInHoldings: true,
          prefix: '',
          callNumber: `YX ${randomDigits}.5 B62 ${randomDigits}`,
          volume: '',
          enumeration: '',
          chronology: '',
          copyNumber: '',
          suffix: '',
        },
        {
          instanceIndex: 7,
          isMarcInstance: false,
          isMarcHoldings: false,
          hasItem: true,
          callNumberInHoldings: false,
          prefix: '',
          callNumber: `YY ${randomDigits}.5 B62 ${randomDigits}`,
          volume: '',
          enumeration: '',
          chronology: '',
          copyNumber: '',
          suffix: '',
        },
        {
          instanceIndex: 7,
          isMarcInstance: false,
          isMarcHoldings: false,
          hasItem: true,
          callNumberInHoldings: false,
          prefix: '',
          callNumber: `YZ ${randomDigits}50 M56 ${randomDigits}`,
          volume: '',
          enumeration: '',
          chronology: '',
          copyNumber: '',
          suffix: '',
        },
        {
          instanceIndex: 7,
          isMarcInstance: false,
          isMarcHoldings: false,
          hasItem: true,
          callNumberInHoldings: true,
          prefix: '',
          callNumber: `YZ ${randomDigits}50 M6 ${randomDigits}`,
          volume: '',
          enumeration: '',
          chronology: '',
          copyNumber: '',
          suffix: '',
        },
      ];

      const expectedQsResults = [
        `QS ${randomDigits} .GA1 E53 ${randomDigits}`,
        `QS ${randomDigits} .GA1 F875d ${randomDigits} CD`,
        `AudCD QS ${randomDigits} .GA1 Q6 ${randomDigits}`,
        `Over QS ${randomDigits} .GI8 P235s ${randomDigits} year`,
        `QS ${randomDigits}24 B811m ${randomDigits} DVD`,
      ];
      const expectedQtResults = [
        `Win QT ${randomDigits} B736 ${randomDigits}3 ast`,
        `QT ${randomDigits} B736 ${randomDigits}9`,
      ];
      const expectedYxResults = [
        `YX ${randomDigits}.5 B5315 ${randomDigits}`,
        `YX ${randomDigits}.5 B62 ${randomDigits}`,
        `YY ${randomDigits}.5 B62 ${randomDigits}`,
        `YZ ${randomDigits}50 M56 ${randomDigits}`,
        `YZ ${randomDigits}50 M6 ${randomDigits}`,
      ];

      before('Create data and user', () => {
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C477536_');
        cy.then(() => {
          CallNumberTypes.getCallNumberTypesViaAPI().then((res) => {
            nlmTypeId = res.find((t) => t.name === CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_MEDICINE).id;
            lcTypeId = res.find((t) => t.name === CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS).id;
          });
          cy.getLocations({ limit: 1, query: '(isActive=true and name<>"AT_*")' }).then((res) => {
            location = res;
          });
          cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((res) => {
            loanTypeId = res[0].id;
          });
          cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((res) => {
            materialTypeId = res.id;
          });
          InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
            holdingsFolioSourceId = folioSource.id;
          });
          cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((types) => {
            instanceTypeId = types[0].id;
          });
        }).then(() => {
          // Create all instances
          cy.then(() => {
            instanceTitles.forEach((title, index) => {
              if (title.includes('Marc')) {
                cy.createSimpleMarcBibViaAPI(title).then((instanceId) => {
                  instanceIds[index] = instanceId;
                });
              } else {
                InventoryInstances.createFolioInstanceViaApi({
                  instance: {
                    instanceTypeId,
                    title,
                  },
                }).then((instanceData) => {
                  instanceIds[index] = instanceData.instanceId;
                });
              }
            });
          }).then(() => {
            // Create MARC holdings
            cy.getInstanceById(instanceIds[0]).then((instanceData) => {
              cy.createSimpleMarcHoldingsViaAPI(
                instanceData.id,
                instanceData.hrid,
                `${location.code} $h ${recordsData[0].callNumber} $t ${recordsData[0].copyNumber} $m ${recordsData[0].suffix}`,
                undefined,
                { tag852firstIndicator: '2' },
              ).then((holdingId) => {
                cy.createItem({
                  holdingsRecordId: holdingId,
                  materialType: { id: materialTypeId },
                  permanentLoanType: { id: loanTypeId },
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  volume: recordsData[0].volume,
                  enumeration: recordsData[0].enumeration,
                  chronology: recordsData[0].chronology,
                });
              });
            });
            cy.getInstanceById(instanceIds[1]).then((instanceData) => {
              cy.createSimpleMarcHoldingsViaAPI(
                instanceData.id,
                instanceData.hrid,
                location.code,
              ).then((holdingId) => {
                cy.createItem({
                  holdingsRecordId: holdingId,
                  materialType: { id: materialTypeId },
                  permanentLoanType: { id: loanTypeId },
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  itemLevelCallNumber: recordsData[2].callNumber,
                  itemLevelCallNumberTypeId: nlmTypeId,
                  itemLevelCallNumberPrefix: recordsData[2].prefix,
                  itemLevelCallNumberSuffix: recordsData[2].suffix,
                  volume: recordsData[2].volume,
                  enumeration: recordsData[2].enumeration,
                  chronology: recordsData[2].chronology,
                  copyNumber: recordsData[2].copyNumber,
                });
              });
              cy.createSimpleMarcHoldingsViaAPI(
                instanceData.id,
                instanceData.hrid,
                `${location.code} $h ${recordsData[1].callNumber} $m ${recordsData[1].suffix}`,
                undefined,
                { tag852firstIndicator: '2' },
              );
            });
          });

          cy.createTempUser([Permissions.inventoryAll.gui]).then((userProps) => {
            tempUser = userProps;
          });
          CallNumberBrowseSettings.assignCallNumberTypesViaApi({
            name: BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL,
            callNumberTypes: [nlmTypeId, lcTypeId],
          });
        });
      });

      before('Create folio holdings, items', () => {
        cy.then(() => {
          // Create all Folio holdings
          recordsData.forEach((record, index) => {
            if (!record.isMarcHoldings && !record.holdingsId) {
              InventoryHoldings.createHoldingRecordViaApi({
                instanceId: instanceIds[record.instanceIndex],
                permanentLocationId: location.id,
                callNumber: record.callNumberInHoldings ? record.callNumber : null,
                callNumberTypeId: record.callNumberInHoldings ? record.nlmTypeId : null,
                callNumberPrefix: record.callNumberInHoldings ? record.prefix : null,
                callNumberSuffix: record.callNumberInHoldings ? record.suffix : null,
                sourceId: holdingsFolioSourceId,
              }).then((holding) => {
                recordsData[index].holdingsId = holding.id;
              });
            }
          });
        }).then(() => {
          // Create all items for Folio holdings
          recordsData.forEach((record) => {
            if (!record.isMarcHoldings && record.hasItem) {
              InventoryItems.createItemViaApi({
                holdingsRecordId: record.holdingsId,
                materialType: { id: materialTypeId },
                permanentLoanType: { id: loanTypeId },
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                itemLevelCallNumber: record.callNumberInHoldings ? null : record.callNumber,
                itemLevelCallNumberTypeId: record.callNumberInHoldings ? null : nlmTypeId,
                itemLevelCallNumberPrefix: record.callNumberInHoldings ? null : record.prefix,
                itemLevelCallNumberSuffix: record.callNumberInHoldings ? null : record.suffix,
                volume: record.volume,
                enumeration: record.enumeration,
                chronology: record.chronology,
                copyNumber: record.copyNumber,
              });
            }
          });
        });
      });

      after('Clean up', () => {
        cy.getAdminToken();
        Users.deleteViaApi(tempUser.userId);
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C477536');
        CallNumberBrowseSettings.assignCallNumberTypesViaApi({
          name: BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL,
          callNumberTypes: [],
        });
      });

      it(
        'C477536 NLM call numbers are sorted alphabetically using "Call numbers (all)" browse option (spitfire)',
        { tags: ['criticalPathFlaky', 'spitfire', 'nonParallel', 'C477536'] },
        () => {
          cy.login(tempUser.username, tempUser.password);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventoryInstances.waitContentLoading();
          // Switch to Browse tab and select Call numbers (all)
          InventorySearchAndFilter.switchToBrowseTab();
          recordsData.forEach((record, index) => {
            if (![1, 4, 9].includes(index)) {
              BrowseCallNumber.waitForCallNumberToAppear(
                `${record.callNumber}${record.suffix ? ' ' + record.suffix : ''}`,
              );
            }
          });
          InventorySearchAndFilter.selectBrowseOption(BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL);

          // Step 1: QS
          InventorySearchAndFilter.fillInBrowseSearch(`QS ${randomDigits}`);
          InventorySearchAndFilter.clickSearch();
          BrowseCallNumber.resultRowsIsInRequiredOder(expectedQsResults);

          // Step 2: QT
          InventorySearchAndFilter.fillInBrowseSearch(`QT ${randomDigits}`);
          InventorySearchAndFilter.clickSearch();
          BrowseCallNumber.resultRowsIsInRequiredOder(expectedQtResults);

          // Step 3: Y
          InventorySearchAndFilter.fillInBrowseSearch(`YX ${randomDigits}`);
          InventorySearchAndFilter.clickSearch();
          BrowseCallNumber.resultRowsIsInRequiredOder(expectedYxResults);
        },
      );
    });
  });
});
