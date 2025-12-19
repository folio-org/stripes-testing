import { Permissions } from '../../../support/dictionary';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import { ITEM_STATUS_NAMES } from '../../../support/constants';
import MaterialTypes from '../../../support/fragments/settings/inventory/materialTypes';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Filters', () => {
      const randomPostfix = getRandomPostfix();
      const randomLetters = getRandomLetters(7);
      const testData = {
        instancesTitlePrefix: `AT_C476761_FolioInstance_${randomPostfix}`,
        materialTypeAccordionName: 'Material type',
        materialTypePrefix: `AT_C476761_${randomLetters}`,
        source: 'local',
        barcodeText: 'No barcode',
      };
      const materialTypes = [];
      let instanceTypeId;
      let user;

      before('Create user, test data', () => {
        cy.getAdminToken();
        MaterialTypes.getMaterialTypesViaApi({ limit: 200 }).then((body) => {
          body.mtypes.forEach((type) => {
            if (type.name.includes('C476761')) {
              MaterialTypes.deleteViaApi(type.id);
            }
          });
        });
        cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then(
          (createdUserProperties) => {
            user = createdUserProperties;
            cy.then(() => {
              cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((types) => {
                instanceTypeId = types[0].id;
              });
              cy.getHoldingTypes({ limit: 1, query: 'source=folio' }).then((res) => {
                testData.holdingTypeId = res[0].id;
              });
              cy.getLocations({ limit: 1, query: '(name<>"*autotest*" and name<>"AT_*")' }).then(
                (res) => {
                  testData.locationId = res.id;
                },
              );
              cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((res) => {
                testData.loanTypeId = res[0].id;
              });

              for (let i = 0; i < 4; i++) {
                MaterialTypes.createMaterialTypeViaApi({
                  name: `${testData.materialTypePrefix}_${i}`,
                  source: testData.source,
                }).then(({ body }) => {
                  materialTypes.push(body);
                });
              }
            })
              .then(() => {
                for (let i = 0; i < 4; i++) {
                  InventoryInstances.createFolioInstanceViaApi({
                    instance: {
                      instanceTypeId,
                      title: `${testData.instancesTitlePrefix}_${i}`,
                    },
                    holdings: [
                      {
                        holdingsTypeId: testData.holdingTypeId,
                        permanentLocationId: testData.locationId,
                      },
                    ],
                    items: [
                      {
                        barcode: testData.itemBarcode,
                        status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                        permanentLoanType: { id: testData.loanTypeId },
                        materialType: { id: materialTypes[i].id },
                      },
                    ],
                  });
                }
                InventoryInstances.createFolioInstanceViaApi({
                  instance: {
                    instanceTypeId,
                    title: `${testData.instancesTitlePrefix}_${4}`,
                  },
                  holdings: [
                    {
                      holdingsTypeId: testData.holdingTypeId,
                      permanentLocationId: testData.locationId,
                    },
                  ],
                  items: [
                    {
                      barcode: testData.itemBarcode,
                      status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                      permanentLoanType: { id: testData.loanTypeId },
                      materialType: { id: materialTypes[0].id },
                    },
                  ],
                });
                InventoryInstances.createFolioInstanceViaApi({
                  instance: {
                    instanceTypeId,
                    title: `${testData.instancesTitlePrefix}_${5}`,
                  },
                  holdings: [
                    {
                      holdingsTypeId: testData.holdingTypeId,
                      permanentLocationId: testData.locationId,
                    },
                  ],
                  items: [
                    {
                      barcode: testData.itemBarcode,
                      status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                      permanentLoanType: { id: testData.loanTypeId },
                      materialType: { id: materialTypes[2].id },
                    },
                  ],
                });
              })
              .then(() => {
                cy.login(user.username, user.password, {
                  path: TopMenu.inventoryPath,
                  waiter: InventoryInstances.waitContentLoading,
                });
                InventorySearchAndFilter.instanceTabIsDefault();
                InventorySearchAndFilter.switchToItem();
                InventorySearchAndFilter.itemTabIsDefault();
              });
          },
        );
      });

      after('Delete user, test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi(`${testData.instancesTitlePrefix}*`);
        materialTypes.forEach((type) => {
          MaterialTypes.deleteViaApi(type.id);
        });
        Users.deleteViaApi(user.userId);
      });

      it(
        'C476761 Filter "Instance" records by Item\'s "Material type" facet (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C476761'] },
        () => {
          InventorySearchAndFilter.toggleAccordionByName(testData.materialTypeAccordionName);
          InventorySearchAndFilter.checkOptionsWithCountersExistInAccordion(
            testData.materialTypeAccordionName,
          );
          cy.intercept('/search/instances*').as('getInstances1');
          InventorySearchAndFilter.selectMultiSelectFilterOption(
            testData.materialTypeAccordionName,
            materialTypes[0].name,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            testData.materialTypeAccordionName,
            materialTypes[0].name,
          );
          cy.wait('@getInstances1', { timeout: 10_000 }).then(() => {
            InventorySearchAndFilter.verifyMultiSelectFilterOptionCount(
              testData.materialTypeAccordionName,
              materialTypes[0].name,
              2,
            );
            InventoryInstances.checkSearchResultCount('^2 records');
            InventoryInstances.selectInstance(1);
            InventoryInstance.waitInventoryLoading();
            InventoryInstance.openHoldingItem({});
            ItemRecordView.verifyMaterialType(materialTypes[0].name);
            ItemRecordView.closeDetailView();
            InventoryInstance.waitInventoryLoading();
            InventorySearchAndFilter.toggleAccordionByName(testData.materialTypeAccordionName);

            cy.intercept('/search/instances*').as('getInstances2');
            InventorySearchAndFilter.selectMultiSelectFilterOption(
              testData.materialTypeAccordionName,
              materialTypes[1].name,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              testData.materialTypeAccordionName,
              materialTypes[0].name,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              testData.materialTypeAccordionName,
              materialTypes[1].name,
            );
            cy.wait('@getInstances2', { timeout: 10_000 }).then(() => {
              InventoryInstances.checkSearchResultCount('^3 records');
              InventoryInstances.selectInstance(2);
              InventoryInstance.waitInventoryLoading();
              InventoryInstance.openHoldingItem({});
              ItemRecordView.verifyMaterialType(
                [materialTypes[0].name, materialTypes[1].name],
                true,
              );
              ItemRecordView.closeDetailView();
              InventoryInstance.waitInventoryLoading();
              InventorySearchAndFilter.toggleAccordionByName(testData.materialTypeAccordionName);

              cy.intercept('/search/instances*').as('getInstances3');
              InventorySearchAndFilter.selectMultiSelectFilterOption(
                testData.materialTypeAccordionName,
                materialTypes[0].name,
              );
              InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                testData.materialTypeAccordionName,
                materialTypes[0].name,
                false,
              );
              InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                testData.materialTypeAccordionName,
                materialTypes[1].name,
              );
              cy.wait('@getInstances3', { timeout: 10_000 }).then(() => {
                InventorySearchAndFilter.verifyMultiSelectFilterOptionCount(
                  testData.materialTypeAccordionName,
                  materialTypes[1].name,
                  1,
                );
                InventoryInstances.checkSearchResultCount('^1 record');
                InventorySearchAndFilter.clearFilter(testData.materialTypeAccordionName);
                InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                  testData.materialTypeAccordionName,
                  materialTypes[1].name,
                  false,
                );
                InventorySearchAndFilter.verifyResultPaneEmpty();

                cy.intercept('/search/instances*').as('getInstancesQuery');
                InventoryInstances.searchByTitle(testData.instancesTitlePrefix);
                cy.wait('@getInstancesQuery', { timeout: 10_000 });

                cy.intercept('/search/instances*').as('getInstances4');
                InventorySearchAndFilter.selectMultiSelectFilterOption(
                  testData.materialTypeAccordionName,
                  materialTypes[2].name,
                );
                InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                  testData.materialTypeAccordionName,
                  materialTypes[2].name,
                );
                cy.wait('@getInstances4', { timeout: 10_000 }).then(() => {
                  InventorySearchAndFilter.verifyMultiSelectFilterOptionCount(
                    testData.materialTypeAccordionName,
                    materialTypes[2].name,
                    2,
                  );
                  InventoryInstances.checkSearchResultCount('^2 records');
                  InventoryInstances.selectInstance();
                  InventoryInstance.waitInventoryLoading();
                  InventoryInstance.openHoldingItem({});
                  ItemRecordView.verifyMaterialType(materialTypes[2].name);
                  ItemRecordView.closeDetailView();
                  InventoryInstance.waitInventoryLoading();
                  InventorySearchAndFilter.toggleAccordionByName(
                    testData.materialTypeAccordionName,
                  );

                  InventorySearchAndFilter.typeValueInMultiSelectFilterFieldAndCheck(
                    testData.materialTypeAccordionName,
                    materialTypes[3].name,
                    true,
                    1,
                  );
                  InventorySearchAndFilter.selectMultiSelectFilterOption(
                    testData.materialTypeAccordionName,
                    materialTypes[3].name,
                  );
                  InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                    testData.materialTypeAccordionName,
                    materialTypes[2].name,
                  );
                  InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                    testData.materialTypeAccordionName,
                    materialTypes[3].name,
                  );
                  InventorySearchAndFilter.selectMultiSelectFilterOption(
                    testData.materialTypeAccordionName,
                    materialTypes[2].name,
                  );
                  InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                    testData.materialTypeAccordionName,
                    materialTypes[2].name,
                    false,
                  );
                  InventorySearchAndFilter.selectMultiSelectFilterOption(
                    testData.materialTypeAccordionName,
                    materialTypes[3].name,
                  );
                  InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
                    testData.materialTypeAccordionName,
                    materialTypes[3].name,
                    false,
                  );
                  InventoryInstances.checkSearchResultCount('^6 records');
                  InventorySearchAndFilter.verifyNumberOfSearchResults(6);
                });
                InventorySearchAndFilter.typeNotFullValueInMultiSelectFilterFieldAndCheck(
                  testData.materialTypeAccordionName,
                  '76761',
                  materialTypes[0].name,
                );
              });
            });
          });
        },
      );
    });
  });
});
