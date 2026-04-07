import Permissions from '../../../../support/dictionary/permissions';
import Users from '../../../../support/fragments/users/users';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import getRandomPostfix, {
  randomFourDigitNumber,
  getRandomLetters,
} from '../../../../support/utils/stringTools';
import {
  CALL_NUMBER_TYPE_NAMES,
  BROWSE_CALL_NUMBER_OPTIONS,
  ITEM_STATUS_NAMES,
} from '../../../../support/constants';
import BrowseCallNumber from '../../../../support/fragments/inventory/search/browseCallNumber';
import { CallNumberTypes } from '../../../../support/fragments/settings/inventory/instances/callNumberTypes';
import {
  CallNumberBrowseSettings,
  callNumbersIds,
} from '../../../../support/fragments/settings/inventory/instances/callNumberBrowse';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';
import BrowseClassifications from '../../../../support/fragments/inventory/search/browseClassifications';
import TopMenu from '../../../../support/fragments/topMenu';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    describe('Sorting', () => {
      const randomPostfix = getRandomPostfix();
      const randomDigits = randomFourDigitNumber();
      const randomLetters = `AR${getRandomLetters(7).toUpperCase()}`;
      const instanceTitlePrefix = `AT_C398024_Instance_${randomPostfix}`;
      const nlmTypeCode = callNumbersIds[BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_MEDICINE];
      const instanceTitles = Array.from({ length: 8 }, (_, i) => `${instanceTitlePrefix}_${i + 1}`);
      const precedingCallNumbers = Array.from({ length: 6 }, (_, i) => `${randomLetters}AAA${i}`);
      let nlmTypeId;
      let location;
      let loanTypeId;
      let materialTypeId;
      let tempUser;
      let holdingsFolioSourceId;
      let instanceTypeId;
      const instanceIds = [];
      const precedingInstances = [];

      // Row data matching TestRail preconditions table
      const recordsData = [
        // Row 1: MARC Instance #1, MARC Holdings, Has Item, Call number in Holdings 852 $h
        {
          instanceIndex: 0,
          isMarcInstance: true,
          isMarcHoldings: true,
          hasItem: true,
          callNumberInHoldings: true,
          prefix: '',
          callNumber: `${randomLetters}QS ${randomDigits} .GA1 E53`,
          volume: 'v. 3',
          enumeration: 'no. 1',
          chronology: '1984',
          copyNumber: '3',
          suffix: `${randomDigits}`,
        },
        // Row 2: MARC Instance #2, MARC Holdings #1, No Item, Call number in Holdings (not displayed)
        {
          instanceIndex: 1,
          isMarcInstance: true,
          isMarcHoldings: true,
          hasItem: false,
          callNumberInHoldings: true,
          prefix: '',
          callNumber: `${randomLetters}QS ${randomDigits} .GA1 E53 ${randomDigits}`,
          volume: '',
          enumeration: '',
          chronology: '',
          copyNumber: '',
          suffix: '',
        },
        // Row 3: MARC Instance #2, MARC Holdings #2, Has Item, Call number in Item
        {
          instanceIndex: 1,
          isMarcInstance: true,
          isMarcHoldings: true,
          hasItem: true,
          callNumberInHoldings: false,
          prefix: '',
          callNumber: `${randomLetters}QS ${randomDigits} .GA1 F875d ${randomDigits}`,
          volume: 'v.2',
          enumeration: 'n.2',
          chronology: '1984-1986',
          copyNumber: 'c. 2',
          suffix: 'CD',
        },
        // Row 4: MARC Instance #3, FOLIO Holdings #1, Has Item, Call number in Holdings
        {
          instanceIndex: 2,
          isMarcInstance: true,
          isMarcHoldings: false,
          hasItem: true,
          callNumberInHoldings: true,
          prefix: 'AudCD',
          callNumber: `${randomLetters}QS ${randomDigits} .GA1 Q6 ${randomDigits}`,
          volume: '',
          enumeration: 'no.3',
          chronology: '',
          copyNumber: 'c1',
          suffix: '',
        },
        // Row 5: MARC Instance #3, FOLIO Holdings #2, No Item, Call number in Holdings (not displayed)
        {
          instanceIndex: 2,
          isMarcInstance: true,
          isMarcHoldings: false,
          hasItem: false,
          callNumberInHoldings: true,
          prefix: '',
          callNumber: `${randomLetters}QS ${randomDigits} .GA1 Q6 ${randomDigits}`,
          volume: '',
          enumeration: '',
          chronology: '',
          copyNumber: '',
          suffix: '',
        },
        // Row 6: MARC Instance #4, FOLIO Holdings, Has Item, Call number in Item
        {
          instanceIndex: 3,
          isMarcInstance: true,
          isMarcHoldings: false,
          hasItem: true,
          callNumberInHoldings: false,
          prefix: 'Over',
          callNumber: `${randomLetters}QS ${randomDigits} .GI8 P235s`,
          volume: '',
          enumeration: 'no.5',
          chronology: '',
          copyNumber: 'c.1',
          suffix: `${randomDigits} year`,
        },
        // Row 7: MARC Instance #5, FOLIO Holdings #1, Has Item #1, Call number in Holdings
        {
          instanceIndex: 4,
          isMarcInstance: true,
          isMarcHoldings: false,
          hasItem: true,
          callNumberInHoldings: true,
          prefix: '',
          callNumber: `${randomLetters}QS ${randomDigits}24 B811m ${randomDigits}`,
          volume: 'vol. 1',
          enumeration: 'N. 01',
          chronology: '',
          copyNumber: '',
          suffix: 'DVD',
        },
        // Row 8: MARC Instance #5, FOLIO Holdings #1, Has Item #2, Call number in Item
        {
          instanceIndex: 4,
          isMarcInstance: true,
          isMarcHoldings: false,
          hasItem: true,
          callNumberInHoldings: false,
          prefix: 'Win',
          callNumber: `${randomLetters}QT ${randomDigits} B736 ${randomDigits}3`,
          volume: 'vol. 2',
          enumeration: 'no.4',
          chronology: '1995',
          copyNumber: 'copy 2',
          suffix: 'ast',
        },
        // Row 9: FOLIO Instance #6, FOLIO Holdings #1, Has Item, Call number in Holdings
        {
          instanceIndex: 5,
          isMarcInstance: false,
          isMarcHoldings: false,
          hasItem: true,
          callNumberInHoldings: true,
          prefix: '',
          callNumber: `${randomLetters}QT ${randomDigits} B736 ${randomDigits}9`,
          volume: '',
          enumeration: '',
          chronology: '',
          copyNumber: '',
          suffix: '',
        },
        // Row 10: FOLIO Instance #6, FOLIO Holdings #2, No Item, Call number in Holdings (not displayed)
        {
          instanceIndex: 5,
          isMarcInstance: false,
          isMarcHoldings: false,
          hasItem: false,
          callNumberInHoldings: true,
          prefix: '',
          callNumber: `${randomLetters}QT ${randomDigits} B736 ${randomDigits}9`,
          volume: '',
          enumeration: '',
          chronology: '',
          copyNumber: '',
          suffix: '',
        },
        // Row 11: FOLIO Instance #7, FOLIO Holdings, Has Item, Call number in Item
        {
          instanceIndex: 6,
          isMarcInstance: false,
          isMarcHoldings: false,
          hasItem: true,
          callNumberInHoldings: false,
          prefix: '',
          callNumber: `${randomLetters}WA ${randomDigits}.5 B5315 ${randomDigits}`,
          volume: '',
          enumeration: '',
          chronology: '',
          copyNumber: '',
          suffix: '',
        },
        // Row 12: FOLIO Instance #8, FOLIO Holdings #1, Has Item #1, Call number in Holdings
        {
          instanceIndex: 7,
          isMarcInstance: false,
          isMarcHoldings: false,
          hasItem: true,
          callNumberInHoldings: true,
          prefix: '',
          callNumber: `${randomLetters}WA ${randomDigits}.5 B62 ${randomDigits}`,
          volume: '',
          enumeration: '',
          chronology: '',
          copyNumber: '',
          suffix: '',
        },
        // Row 13: FOLIO Instance #8, FOLIO Holdings #1, Has Item #2, Call number in Item
        {
          instanceIndex: 7,
          isMarcInstance: false,
          isMarcHoldings: false,
          hasItem: true,
          callNumberInHoldings: false,
          prefix: '',
          callNumber: `${randomLetters}WB ${randomDigits}.5 B62 ${randomDigits}`,
          volume: '',
          enumeration: '',
          chronology: '',
          copyNumber: '',
          suffix: '',
        },
        // Row 14: FOLIO Instance #8, FOLIO Holdings #2, Has Item, Call number in Item
        {
          instanceIndex: 7,
          isMarcInstance: false,
          isMarcHoldings: false,
          hasItem: true,
          callNumberInHoldings: false,
          prefix: '',
          callNumber: `${randomLetters}WC ${randomDigits}50 M56 ${randomDigits}`,
          volume: '',
          enumeration: '',
          chronology: '',
          copyNumber: '',
          suffix: '',
        },
        // Row 15: FOLIO Instance #8, FOLIO Holdings #3, Has Item, Call number in Holdings
        {
          instanceIndex: 7,
          isMarcInstance: false,
          isMarcHoldings: false,
          hasItem: true,
          callNumberInHoldings: true,
          prefix: '',
          callNumber: `${randomLetters}WC ${randomDigits}50 M6 ${randomDigits}`,
          volume: '',
          enumeration: '',
          chronology: '',
          copyNumber: '',
          suffix: '',
        },
      ];

      const expectedOrder = [
        `${randomLetters}QS ${randomDigits} .GA1 E53 ${randomDigits}`,
        `${randomLetters}QS ${randomDigits} .GA1 F875d ${randomDigits} CD`,
        `AudCD ${randomLetters}QS ${randomDigits} .GA1 Q6 ${randomDigits}`,
        `Over ${randomLetters}QS ${randomDigits} .GI8 P235s ${randomDigits} year`,
        `${randomLetters}QS ${randomDigits}24 B811m ${randomDigits} DVD`,
        `Win ${randomLetters}QT ${randomDigits} B736 ${randomDigits}3 ast`,
        `${randomLetters}QT ${randomDigits} B736 ${randomDigits}9`,
        `${randomLetters}WA ${randomDigits}.5 B5315 ${randomDigits}`,
        `${randomLetters}WA ${randomDigits}.5 B62 ${randomDigits}`,
        `${randomLetters}WB ${randomDigits}.5 B62 ${randomDigits}`,
        `${randomLetters}WC ${randomDigits}50 M56 ${randomDigits}`,
        `${randomLetters}WC ${randomDigits}50 M6 ${randomDigits}`,
      ];

      before('Create data and user', () => {
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C398024');
        cy.then(() => {
          CallNumberTypes.getCallNumberTypesViaAPI().then((res) => {
            nlmTypeId = res.find((t) => t.name === CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_MEDICINE).id;
          });
          cy.getLocations({
            limit: 1,
            query: '(isActive=true and name<>"AT_*" and name<>"*auto*")',
          }).then((res) => {
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
              if (recordsData.find((el) => el.instanceIndex === index && el.isMarcInstance)) {
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
            // Row 1: MARC Holdings for Instance #1 with call number in 852 $h
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
            // Rows 2-3: MARC Holdings for Instance #2
            cy.getInstanceById(instanceIds[1]).then((instanceData) => {
              // Row 3: MARC Holdings #2 without call number, item has call number
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
              // Row 2: MARC Holdings #1 with call number in 852, no item (not displayed)
              cy.createSimpleMarcHoldingsViaAPI(
                instanceData.id,
                instanceData.hrid,
                `${location.code} $h ${recordsData[1].callNumber}`,
                undefined,
                { tag852firstIndicator: '2' },
              );
            });
          });

          cy.createTempUser([Permissions.inventoryAll.gui]).then((userProps) => {
            tempUser = userProps;
          });
        });
      });

      before('Create FOLIO holdings and items', () => {
        cy.then(() => {
          recordsData.forEach((record, index) => {
            if (!record.isMarcHoldings && !record.holdingsId) {
              InventoryHoldings.createHoldingRecordViaApi({
                instanceId: instanceIds[record.instanceIndex],
                permanentLocationId: location.id,
                sourceId: holdingsFolioSourceId,
                ...(record.callNumberInHoldings && {
                  callNumber: record.callNumber,
                  callNumberTypeId: nlmTypeId,
                  callNumberPrefix: record.prefix,
                  callNumberSuffix: record.suffix,
                }),
              }).then((holding) => {
                recordsData[index].holdingsId = holding.id;
              });
            }
          });
        })
          .then(() => {
            recordsData.forEach((record) => {
              if (!record.isMarcHoldings && record.hasItem) {
                InventoryItems.createItemViaApi({
                  holdingsRecordId: record.holdingsId,
                  materialType: { id: materialTypeId },
                  permanentLoanType: { id: loanTypeId },
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  ...(!record.callNumberInHoldings && {
                    itemLevelCallNumber: record.callNumber,
                    itemLevelCallNumberTypeId: nlmTypeId,
                    itemLevelCallNumberPrefix: record.prefix,
                    itemLevelCallNumberSuffix: record.suffix,
                  }),
                  ...(record.volume && { volume: record.volume }),
                  ...(record.enumeration && { enumeration: record.enumeration }),
                  ...(record.chronology && { chronology: record.chronology }),
                  ...(record.copyNumber && { copyNumber: record.copyNumber }),
                });
              }
            });

            // data for instances with preceding call numbers
            // so that there would always be previous result page available
            precedingCallNumbers.forEach((callNumber) => {
              precedingInstances.push(
                InventoryInstances.generateFolioInstances({
                  instanceTitlePrefix,
                  items: [
                    {
                      status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                      itemLevelCallNumber: callNumber,
                      itemLevelCallNumberTypeId: nlmTypeId,
                    },
                  ],
                })[0],
              );
            });
            InventoryInstances.createFolioInstancesViaApi({
              folioInstances: precedingInstances,
              location,
            });
          })
          .then(() => {
            CallNumberBrowseSettings.assignCallNumberTypesViaApi({
              name: BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_MEDICINE,
              callNumberTypes: [
                CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_MEDICINE,
                CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS,
              ],
            });

            cy.login(tempUser.username, tempUser.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
              authRefresh: true,
            });
          });
      });

      after('Clean up', () => {
        cy.getAdminToken();
        Users.deleteViaApi(tempUser.userId);
        InventoryInstances.deleteFullInstancesByTitleViaApi(instanceTitlePrefix);
        CallNumberBrowseSettings.assignCallNumberTypesViaApi({
          name: BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_MEDICINE,
          callNumberTypes: [],
        });
      });

      it(
        'C398024 Call numbers are sorted by "NLM" type when using "National Library of Medicine classification" browse option (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'nonParallel', 'C398024'] },
        () => {
          InventorySearchAndFilter.switchToBrowseTab();
          InventorySearchAndFilter.validateBrowseToggleIsSelected();
          // Wait for all displayed call numbers to be indexed
          recordsData.forEach((record, index) => {
            // Skip indices 1, 4, 9 (not displayed - holdings without items)
            if (![1, 4, 9].includes(index)) {
              BrowseCallNumber.waitForCallNumberToAppear(
                `${record.callNumber}${record.suffix ? ` ${record.suffix}` : ''}`,
                true,
                nlmTypeCode,
              );
            }
          });
          precedingCallNumbers.forEach((callNumber) => {
            BrowseCallNumber.waitForCallNumberToAppear(callNumber, true, nlmTypeCode);
          });
          InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
            BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_MEDICINE,
          );
          InventorySearchAndFilter.checkBrowseOptionSelected(
            BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_MEDICINE,
          );
          // Search for exact match call number
          InventorySearchAndFilter.fillInBrowseSearch(expectedOrder[0]);
          InventorySearchAndFilter.clickSearch();
          BrowseCallNumber.valueInResultTableIsHighlighted(expectedOrder[0]);
          BrowseCallNumber.resultRowsIsInRequiredOder(expectedOrder);
          // workaround for https://folio-org.atlassian.net/browse/MSEARCH-1195
          InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
            BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL,
          );
          BrowseClassifications.checkPaginationButtonsShown();
        },
      );
    });
  });
});
