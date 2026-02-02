import { Permissions } from '../../../support/dictionary';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import StatisticalCodes from '../../../support/fragments/settings/inventory/instance-holdings-item/statisticalCodes';
import MaterialTypes from '../../../support/fragments/settings/inventory/materialTypes';
import { ITEM_STATUS_NAMES } from '../../../support/constants';

// Test constants
const STAT_CODE_ACCORDION = 'Statistical code';

// Helper to build UI facet option name
function buildUiOptionName(typeName, code, name) {
  return `${typeName}: ${code} - ${name}`;
}

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Filters', () => {
      const randomPostfix = getRandomPostfix();
      const randomLetters = getRandomLetters(7);
      const testData = {
        instancesTitlePrefix: `AT_C476764_FolioInstance_${randomPostfix}`,
        statCodePrefix: `AT_C476764_${randomLetters}`,
        barcodePrefix: `AT_C476764_${randomLetters}`,
        source: 'local',
        itemCount: 4,
      };
      let user;
      let instanceTypeId;
      let holdingTypeId;
      let locationId;
      let loanTypeId;
      let statCodeType;
      let materialCodeId;
      const statCodes = [];
      const createdInstanceIds = [];
      const createdHoldingIds = [];
      const createdItemIds = [];
      const statCodeUiOptions = [];
      const itemBarcodes = [];

      before('Create user, data', () => {
        cy.getAdminToken();
        // Clean up any old test codes
        cy.getStatisticalCodes({ limit: 200 }).then((codes) => {
          codes.forEach((code) => {
            if (code.name.includes('C476764')) {
              StatisticalCodes.deleteViaApi(code.id);
            }
          });
        });

        // Create user
        cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((createdUser) => {
          user = createdUser;
          cy.then(() => {
            cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((types) => {
              instanceTypeId = types[0].id;
            });
            cy.getHoldingTypes({ limit: 1, query: 'source=folio' }).then((res) => {
              holdingTypeId = res[0].id;
            });
            cy.getLocations({ limit: 1, query: '(name<>"*autotest*" and name<>"AT_*")' }).then(
              (res) => {
                locationId = res.id;
              },
            );
            cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((res) => {
              loanTypeId = res[0].id;
            });
            cy.getStatisticalCodeTypes({ limit: 1, query: 'source=folio' }).then((types) => {
              statCodeType = types[0];
            });
            MaterialTypes.getMaterialTypesViaApi({ limit: 1, query: 'source=folio' }).then(
              (body) => {
                materialCodeId = body.mtypes[0].id;
              },
            );
          })
            .then(() => {
              // Create unique statistical codes
              for (let i = 0; i < testData.itemCount; i++) {
                const currentStatCodeType = statCodeType; // capture current value
                StatisticalCodes.createViaApi({
                  name: `${testData.statCodePrefix}_${i}`,
                  source: testData.source,
                  code: `usc_${randomLetters}_${i}`,
                  statisticalCodeTypeId: currentStatCodeType.id,
                }).then((code) => {
                  statCodes.push(code);
                  statCodeUiOptions.push(
                    buildUiOptionName(currentStatCodeType.name, code.code, code.name),
                  );
                });
              }
            })
            .then(() => {
              // Create instances, each with a holding and an item with a unique statistical code
              for (let i = 0; i < testData.itemCount; i++) {
                const barcode = `${testData.barcodePrefix}_${i}`;
                itemBarcodes.push(barcode);
                InventoryInstances.createFolioInstanceViaApi({
                  instance: {
                    instanceTypeId,
                    title: `${testData.instancesTitlePrefix}_${i}`,
                  },
                  holdings: [
                    {
                      holdingsTypeId: holdingTypeId,
                      permanentLocationId: locationId,
                    },
                  ],
                  items: [
                    {
                      barcode,
                      status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                      permanentLoanType: { id: loanTypeId },
                      materialType: { id: materialCodeId },
                      statisticalCodeIds: [statCodes[i].id],
                    },
                  ],
                }).then((instanceData) => {
                  createdInstanceIds.push(instanceData.instanceId);
                  if (instanceData.holdings.length > 0) createdHoldingIds.push(instanceData.holdings[0].id);
                  if (instanceData.items.length > 0) createdItemIds.push(instanceData.items[0].id);
                });
              }
            })
            .then(() => {
              cy.login(user.username, user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
                authRefresh: true,
              });
              InventorySearchAndFilter.instanceTabIsDefault();
              InventorySearchAndFilter.switchToItem();
              InventorySearchAndFilter.itemTabIsDefault();
            });
        });
      });

      after('Delete user, data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi(`${testData.instancesTitlePrefix}*`);
        statCodes.forEach((code) => {
          StatisticalCodes.deleteViaApi(code.id);
        });
        Users.deleteViaApi(user.userId);
      });

      it(
        'C476764 Filter "Instance" records by Item\'s "Statistical code" facet (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C476764'] },
        () => {
          // 1. Open facet, check options and counters
          InventorySearchAndFilter.toggleAccordionByName(STAT_CODE_ACCORDION);
          InventorySearchAndFilter.checkOptionsWithCountersExistInAccordion(STAT_CODE_ACCORDION);

          // 2. Select first statistical code
          cy.intercept('/search/instances*').as('getInstances1');
          InventorySearchAndFilter.selectMultiSelectFilterOption(
            STAT_CODE_ACCORDION,
            statCodeUiOptions[0],
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            STAT_CODE_ACCORDION,
            statCodeUiOptions[0],
          );
          cy.wait('@getInstances1', { timeout: 10_000 }).then((instances1) => {
            InventorySearchAndFilter.verifyMultiSelectFilterOptionCount(
              STAT_CODE_ACCORDION,
              statCodeUiOptions[0],
              instances1.response.body.totalRecords,
            );
            InventoryInstances.checkSearchResultCount(
              `^${instances1.response.body.totalRecords.toLocaleString('en-US')} record`,
            );
            InventoryInstances.selectInstance();
            InventoryInstance.waitInventoryLoading();
            InventoryInstance.openHoldingItem({ barcode: itemBarcodes[0] });
            ItemRecordView.verifyStatisticalCode(statCodes[0].name);
            ItemRecordView.closeDetailView();
            InventoryInstance.waitInventoryLoading();
            InventorySearchAndFilter.toggleAccordionByName(STAT_CODE_ACCORDION);

            // 5. Select another statistical code (multi-select)
            cy.intercept('/search/instances*').as('getInstances2');
            InventorySearchAndFilter.selectMultiSelectFilterOption(
              STAT_CODE_ACCORDION,
              statCodeUiOptions[1],
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              STAT_CODE_ACCORDION,
              statCodeUiOptions[0],
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              STAT_CODE_ACCORDION,
              statCodeUiOptions[1],
            );
            cy.wait('@getInstances2', { timeout: 10_000 }).then((instances2) => {
              InventoryInstances.checkSearchResultCount(
                `^${instances2.response.body.totalRecords.toLocaleString('en-US')} record`,
              );
              InventoryInstances.selectInstance(1);
              InventoryInstance.waitInventoryLoading();
              InventoryInstance.openHoldingItem({ barcode: itemBarcodes[1] });
              ItemRecordView.verifyStatisticalCode(statCodes[1].name);
              ItemRecordView.closeDetailView();
              InventoryInstance.waitInventoryLoading();
              InventorySearchAndFilter.toggleAccordionByName(STAT_CODE_ACCORDION);

              // 8. Uncheck one of the selected codes
              cy.intercept('/search/instances*').as('getInstances3');
              InventorySearchAndFilter.selectMultiSelectFilterOption(
                STAT_CODE_ACCORDION,
                statCodeUiOptions[0],
              );
              InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                STAT_CODE_ACCORDION,
                statCodeUiOptions[0],
                false,
              );
              InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                STAT_CODE_ACCORDION,
                statCodeUiOptions[1],
              );
              cy.wait('@getInstances3', { timeout: 10_000 }).then((instances3) => {
                InventoryInstances.checkSearchResultCount(
                  `^${instances3.response.body.totalRecords.toLocaleString('en-US')} record`,
                );
                // 9. Reset facet selection
                InventorySearchAndFilter.clearFilter(STAT_CODE_ACCORDION);
                InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                  STAT_CODE_ACCORDION,
                  statCodeUiOptions[1],
                  false,
                );
                InventorySearchAndFilter.verifyResultPaneEmpty();

                // 10. Run search
                cy.intercept('/search/instances*').as('getInstancesQuery');
                InventorySearchAndFilter.executeSearch(testData.instancesTitlePrefix);
                cy.wait('@getInstancesQuery', { timeout: 10_000 });

                // 11. Select a code again
                cy.intercept('/search/instances*').as('getInstances4');
                InventorySearchAndFilter.selectMultiSelectFilterOption(
                  STAT_CODE_ACCORDION,
                  statCodeUiOptions[2],
                );
                InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                  STAT_CODE_ACCORDION,
                  statCodeUiOptions[2],
                );
                cy.wait('@getInstances4', { timeout: 10_000 }).then((instances4) => {
                  InventorySearchAndFilter.verifyMultiSelectFilterOptionCount(
                    STAT_CODE_ACCORDION,
                    statCodeUiOptions[2],
                    instances4.response.body.totalRecords,
                  );
                  InventoryInstances.checkSearchResultCount(
                    `^${instances4.response.body.totalRecords.toLocaleString('en-US')} record`,
                  );
                  InventoryInstances.selectInstance();
                  InventoryInstance.waitInventoryLoading();
                  InventoryInstance.openHoldingItem({ barcode: itemBarcodes[2] });
                  ItemRecordView.verifyStatisticalCode(statCodes[2].name);
                  ItemRecordView.closeDetailView();
                  InventoryInstance.waitInventoryLoading();
                  InventorySearchAndFilter.toggleAccordionByName(STAT_CODE_ACCORDION);

                  // 14. Type in facet input
                  InventorySearchAndFilter.typeValueInMultiSelectFilterFieldAndCheck(
                    STAT_CODE_ACCORDION,
                    statCodeUiOptions[3],
                    true,
                    1,
                  );
                  // 15. Select found value, clear input
                  cy.intercept('/search/instances*').as('getInstances5');
                  InventorySearchAndFilter.selectMultiSelectFilterOption(
                    STAT_CODE_ACCORDION,
                    statCodeUiOptions[3],
                  );
                  InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                    STAT_CODE_ACCORDION,
                    statCodeUiOptions[2],
                  );
                  InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                    STAT_CODE_ACCORDION,
                    statCodeUiOptions[3],
                  );
                  InventorySearchAndFilter.selectMultiSelectFilterOption(
                    STAT_CODE_ACCORDION,
                    statCodeUiOptions[2],
                  );
                  InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                    STAT_CODE_ACCORDION,
                    statCodeUiOptions[2],
                    false,
                  );
                  InventorySearchAndFilter.selectMultiSelectFilterOption(
                    STAT_CODE_ACCORDION,
                    statCodeUiOptions[3],
                  );
                  InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                    STAT_CODE_ACCORDION,
                    statCodeUiOptions[3],
                    false,
                  );
                  InventoryInstances.checkSearchResultCount(
                    `^${testData.itemCount.toLocaleString('en-US')} record`,
                  );
                });
                InventorySearchAndFilter.typeNotFullValueInMultiSelectFilterFieldAndCheck(
                  STAT_CODE_ACCORDION,
                  '76764',
                  statCodeUiOptions[0],
                );
              });
            });
          });
        },
      );
    });
  });
});
