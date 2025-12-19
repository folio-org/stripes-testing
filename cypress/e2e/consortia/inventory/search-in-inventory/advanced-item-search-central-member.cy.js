import Permissions from '../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import InventoryInstances, {
  searchItemsOptions,
} from '../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import {
  INSTANCE_SOURCE_NAMES,
  ADVANCED_SEARCH_MODIFIERS,
  ITEM_STATUS_NAMES,
} from '../../../../support/constants';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Consortia', () => {
      const randomPostfix = getRandomPostfix();
      const instancePrefix = `AT_C411789_Instance_${randomPostfix}`;
      const notePrefix = `AT_C411789_Note_${randomPostfix}`;
      const barcodePrefix = `AT_C411789_Barcode_${randomPostfix}`;
      const helbyAccordionName = 'Held by';
      const searchOptions = {
        notesAll: searchItemsOptions[6],
        barcode: searchItemsOptions[1],
        keyword: 'Keyword (title, contributor, identifier)',
      };
      const instancesData = [
        {
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.Consortia,
          holdingsAffiliations: [Affiliations.College],
          itemsParams: [{ hasNote: true, hasBarcode: false }],
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.Consortia,
          holdingsAffiliations: [Affiliations.University],
          itemsParams: [{ hasNote: false, hasBarcode: true }],
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.Consortia,
          holdingsAffiliations: [Affiliations.College, Affiliations.University],
          itemsParams: [
            { hasNote: false, hasBarcode: false },
            { hasNote: true, hasBarcode: false },
          ],
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.Consortia,
          holdingsAffiliations: [Affiliations.College],
          itemsParams: [{ hasNote: false, hasBarcode: true }],
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.Consortia,
          holdingsAffiliations: [Affiliations.University],
          itemsParams: [{ hasNote: true, hasBarcode: false }],
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.Consortia,
          holdingsAffiliations: [Affiliations.College, Affiliations.University],
          itemsParams: [
            { hasNote: false, hasBarcode: false },
            { hasNote: false, hasBarcode: true },
          ],
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.College,
          holdingsAffiliations: [Affiliations.College],
          itemsParams: [{ hasNote: false, hasBarcode: true }],
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.College,
          holdingsAffiliations: [Affiliations.College],
          itemsParams: [{ hasNote: true, hasBarcode: false }],
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.University,
          holdingsAffiliations: [Affiliations.University],
          itemsParams: [{ hasNote: true, hasBarcode: false }],
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.University,
          holdingsAffiliations: [Affiliations.University],
          itemsParams: [{ hasNote: false, hasBarcode: true }],
        },
      ];
      const instanceTitles = Array.from(
        { length: instancesData.length },
        (_, i) => `${instancePrefix}_${i}`,
      );
      const expectedInstanceIndexesCentral = instancesData
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => item.affiliation === Affiliations.Consortia)
        .map(({ index }) => index);
      const expectedInstanceIndexesMember = instancesData
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => item.affiliation !== Affiliations.University)
        .map(({ index }) => index);
      let user;
      const locations = {
        [Affiliations.College]: null,
        [Affiliations.University]: null,
      };
      let holdingsSourceId;
      let noteTypeId;
      let loanTypeId;
      let materialTypeId;

      before('Create user, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C411789');

        cy.createTempUser([Permissions.uiInventoryViewInstances.gui])
          .then((userProperties) => {
            user = userProperties;
            cy.assignAffiliationToUser(Affiliations.College, user.userId);

            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(user.userId, [
              Permissions.uiInventoryViewInstances.gui,
            ]);
            InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C411789');

            cy.setTenant(Affiliations.University);
            InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C411789');
          })
          .then(() => {
            cy.resetTenant();
            cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
              instancesData.forEach((instanceData, index) => {
                cy.setTenant(instanceData.affiliation);

                if (instanceData.instanceSource === INSTANCE_SOURCE_NAMES.FOLIO) {
                  InventoryInstances.createFolioInstanceViaApi({
                    instance: {
                      instanceTypeId: instanceTypes[0].id,
                      title: `${instanceTitles[index]}`,
                    },
                  }).then((createdInstanceData) => {
                    instanceData.instanceId = createdInstanceData.instanceId;
                  });
                } else {
                  cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, [
                    {
                      tag: '008',
                      content: QuickMarcEditor.defaultValid008Values,
                    },
                    {
                      tag: '245',
                      content: `$a ${instanceTitles[index]}`,
                      indicators: ['1', '1'],
                    },
                  ]).then((instanceId) => {
                    instanceData.instanceId = instanceId;
                  });
                }
              });
            });
          })
          .then(() => {
            cy.setTenant(Affiliations.College);
            cy.getLocations({
              limit: 1,
              query: '(isActive=true and name<>"AT_*" and name<>"auto*")',
            }).then((res) => {
              locations[Affiliations.College] = res;
            });
            InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
              holdingsSourceId = folioSource.id;
            });
            InventoryInstances.getItemNoteTypes({
              query: 'source=="folio"',
            }).then((noteTypes) => {
              noteTypeId = noteTypes[0].id;
            });
            cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((loanTypes) => {
              loanTypeId = loanTypes[0].id;
            });
            cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((res) => {
              materialTypeId = res.id;
            });
            cy.setTenant(Affiliations.University);
            cy.getLocations({
              limit: 1,
              query: '(isActive=true and name<>"AT_*" and name<>"auto*")',
            }).then((res) => {
              locations[Affiliations.University] = res;
            });
          })
          .then(() => {
            instancesData.forEach((instanceData, instanceIndex) => {
              instanceData.holdingsAffiliations.forEach((holdingsAffiliation, holdingsIndex) => {
                cy.setTenant(holdingsAffiliation);
                const holdingsParams = {
                  instanceId: instanceData.instanceId,
                  permanentLocationId: locations[holdingsAffiliation].id,
                  sourceId: holdingsSourceId,
                };
                if (instanceData.itemsParams[holdingsIndex].hasNote) {
                  holdingsParams.notes = [
                    {
                      itemNoteTypeId: noteTypeId,
                      note: `${notePrefix}_${instanceIndex}-${holdingsIndex}`,
                      staffOnly: false,
                    },
                  ];
                }
                InventoryHoldings.createHoldingRecordViaApi({
                  instanceId: instanceData.instanceId,
                  permanentLocationId: locations[holdingsAffiliation].id,
                  sourceId: holdingsSourceId,
                }).then((holding) => {
                  const itemData = {
                    holdingsRecordId: holding.id,
                    materialType: { id: materialTypeId },
                    permanentLoanType: { id: loanTypeId },
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  };
                  if (instanceData.itemsParams[holdingsIndex].hasNote) {
                    itemData.notes = [
                      {
                        itemNoteTypeId: noteTypeId,
                        note: `${notePrefix}_${instanceIndex}-${holdingsIndex}`,
                        staffOnly: false,
                      },
                    ];
                  }
                  if (instanceData.itemsParams[holdingsIndex].hasBarcode) {
                    itemData.barcode = `${barcodePrefix}_${instanceIndex}-${holdingsIndex}`;
                  }
                  InventoryItems.createItemViaApi(itemData);
                });
              });
            });
          })
          .then(() => {
            cy.resetTenant();
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            InventorySearchAndFilter.switchToItem();
            InventorySearchAndFilter.itemTabIsDefault();
          });
      });

      after('Delete user, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        InventoryInstances.deleteFullInstancesByTitleViaApi(instancePrefix);

        cy.setTenant(Affiliations.University);
        InventoryInstances.deleteFullInstancesByTitleViaApi(instancePrefix);

        cy.resetTenant();
        Users.deleteViaApi(user.userId);
        InventoryInstances.deleteFullInstancesByTitleViaApi(instancePrefix);
      });

      it(
        'C411789 Search for Shared/Local records by "Advanced search" search option from "Item" tab in "Central" and "Member 1" tenants ("Note" and "Barcode" search options) (consortia) (spitfire)',
        { tags: ['extendedPathECS', 'spitfire', 'C411789'] },
        () => {
          function verifyAdvancedSearch(expectedIndexes) {
            InventoryInstances.clickAdvSearchButton();
            InventoryInstances.fillAdvSearchRow(
              0,
              notePrefix,
              ADVANCED_SEARCH_MODIFIERS.EXACT_PHRASE,
              searchOptions.notesAll,
            );
            InventoryInstances.checkAdvSearchModalValues(
              0,
              notePrefix,
              ADVANCED_SEARCH_MODIFIERS.EXACT_PHRASE,
              searchOptions.notesAll,
            );
            InventoryInstances.fillAdvSearchRow(
              1,
              barcodePrefix,
              ADVANCED_SEARCH_MODIFIERS.CONTAINS_ALL,
              searchOptions.barcode,
              'OR',
            );
            InventoryInstances.checkAdvSearchModalValues(
              1,
              barcodePrefix,
              ADVANCED_SEARCH_MODIFIERS.CONTAINS_ALL,
              searchOptions.barcode,
              'OR',
            );
            InventoryInstances.clickSearchBtnInAdvSearchModal();

            expectedIndexes.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
            });
            InventorySearchAndFilter.checkRowsCount(expectedIndexes.length);

            InventoryInstances.clickAdvSearchButton();
            InventoryInstances.checkAdvSearchModalValues(
              0,
              notePrefix,
              ADVANCED_SEARCH_MODIFIERS.EXACT_PHRASE,
              searchOptions.notesAll,
            );
            InventoryInstances.checkAdvSearchModalValues(
              1,
              barcodePrefix,
              ADVANCED_SEARCH_MODIFIERS.CONTAINS_ALL,
              searchOptions.barcode,
              'OR',
            );
            InventoryInstances.fillAdvSearchRow(
              2,
              instancePrefix,
              ADVANCED_SEARCH_MODIFIERS.STARTS_WITH,
              searchOptions.keyword,
              'AND',
            );
            InventoryInstances.checkAdvSearchModalValues(
              2,
              instancePrefix,
              ADVANCED_SEARCH_MODIFIERS.STARTS_WITH,
              searchOptions.keyword,
              'AND',
            );
            InventoryInstances.clickSearchBtnInAdvSearchModal();

            expectedIndexes.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
            });
            InventorySearchAndFilter.checkRowsCount(expectedIndexes.length);
          }

          verifyAdvancedSearch(expectedInstanceIndexesCentral);

          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          InventoryInstances.waitContentLoading();

          InventorySearchAndFilter.switchToItem();
          InventorySearchAndFilter.itemTabIsDefault();
          InventorySearchAndFilter.clearDefaultFilter(helbyAccordionName);

          verifyAdvancedSearch(expectedInstanceIndexesMember);
        },
      );
    });
  });
});
