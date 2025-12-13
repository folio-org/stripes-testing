import Permissions from '../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import { INSTANCE_SOURCE_NAMES, ITEM_STATUS_NAMES } from '../../../../support/constants';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import NewLocation from '../../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Consortia', () => {
      const randomPostfix = getRandomPostfix();
      const instancePrefix = `AT_C411646_Instance_${randomPostfix}`;
      const shelvingTitleValue = `AT_C411646_ShelvingTitle_${randomPostfix}`;
      const barcodePrefix = `AT_C411646_Barcode_${randomPostfix}`;
      const allSearchOption = 'All';
      const instancesData = [
        {
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.Consortia,
          hasHoldings: false,
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.Consortia,
          hasHoldings: true,
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.Consortia,
          hasHoldings: false,
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.Consortia,
          hasHoldings: true,
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.College,
          hasHoldings: true,
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.College,
          hasHoldings: true,
        },
      ];
      const instanceTitles = Array.from(
        { length: instancesData.length },
        (_, i) => `${instancePrefix}_${i}`,
      );
      const barcodeValues = Array.from(
        { length: instancesData.length },
        (_, i) => `${barcodePrefix}_${i}`,
      );
      const sharedInstanceIndexes = instancesData
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => item.affiliation === Affiliations.Consortia)
        .map(({ index }) => index);
      const sharedInstanceWithHoldingsIndexes = instancesData
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => item.affiliation === Affiliations.Consortia && item.hasHoldings)
        .map(({ index }) => index);
      let user;
      let memberLocation;
      let hodingsSourceId;
      let materialTypeId;
      let loanTypeId;

      before('Create user, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C411646');

        cy.createTempUser([Permissions.uiInventoryViewInstances.gui])
          .then((userProperties) => {
            user = userProperties;

            cy.setTenant(Affiliations.College);
            InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C411646');
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
                  const marcInstanceFields = [
                    {
                      tag: '008',
                      content: QuickMarcEditor.defaultValid008Values,
                    },
                    {
                      tag: '245',
                      content: `$a ${instanceTitles[index]}`,
                      indicators: ['1', '1'],
                    },
                  ];
                  cy.createMarcBibliographicViaAPI(
                    QuickMarcEditor.defaultValidLdr,
                    marcInstanceFields,
                  ).then((instanceId) => {
                    instanceData.instanceId = instanceId;
                  });
                }
              });
            });
          })
          .then(() => {
            cy.setTenant(Affiliations.College);
            ServicePoints.getViaApi().then((servicePoint) => {
              NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePoint[0].id)).then(
                (res) => {
                  memberLocation = res;
                },
              );
            });
            InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
              hodingsSourceId = folioSource.id;
            });
            cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((res) => {
              loanTypeId = res[0].id;
            });
            cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((matType) => {
              materialTypeId = matType.id;
            });
          })
          .then(() => {
            instancesData.forEach((instanceData, index) => {
              if (instanceData.hasHoldings) {
                InventoryHoldings.createHoldingRecordViaApi({
                  instanceId: instanceData.instanceId,
                  permanentLocationId: memberLocation.id,
                  sourceId: hodingsSourceId,
                  shelvingTitle: shelvingTitleValue,
                }).then((createdHoldings) => {
                  InventoryItems.createItemViaApi({
                    barcode: barcodeValues[index],
                    holdingsRecordId: createdHoldings.id,
                    materialType: { id: materialTypeId },
                    permanentLoanType: { id: loanTypeId },
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  });
                });
              }
            });
          })
          .then(() => {
            cy.resetTenant();
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          });
      });

      after('Delete user, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        InventoryInstances.deleteFullInstancesByTitleViaApi(instancePrefix);

        cy.resetTenant();
        Users.deleteViaApi(user.userId);
        InventoryInstances.deleteFullInstancesByTitleViaApi(instancePrefix);

        cy.wait(1000);
        cy.setTenant(Affiliations.College);
        NewLocation.deleteInstitutionCampusLibraryLocationViaApi(
          memberLocation.institutionId,
          memberLocation.campusId,
          memberLocation.libraryId,
          memberLocation.id,
        );
      });

      it(
        'C411646 Search for Shared/Local records by "All" search option from "Central" tenant (Instance, Holdings, Item tabs) (consortia) (spitfire)',
        { tags: ['extendedPathECS', 'spitfire', 'C411646'] },
        () => {
          function searchAndVerify() {
            InventorySearchAndFilter.verifyResultPaneEmpty();
            InventorySearchAndFilter.checkSearchQueryText('');

            InventorySearchAndFilter.selectSearchOption(allSearchOption);

            InventorySearchAndFilter.fillInSearchQuery(instancePrefix);
            InventorySearchAndFilter.clickSearch();
            sharedInstanceIndexes.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
            });
            InventorySearchAndFilter.checkRowsCount(sharedInstanceIndexes.length);

            InventorySearchAndFilter.fillInSearchQuery(shelvingTitleValue);
            cy.intercept('GET', '/search/instances*').as('getRecords1');
            InventorySearchAndFilter.clickSearch();
            cy.wait('@getRecords1').its('response.statusCode').should('eq', 200);
            sharedInstanceWithHoldingsIndexes.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
            });
            InventorySearchAndFilter.checkRowsCount(sharedInstanceWithHoldingsIndexes.length);

            InventorySearchAndFilter.fillInSearchQuery(`${barcodePrefix}*`);
            cy.intercept('GET', '/search/instances*').as('getRecords2');
            InventorySearchAndFilter.clickSearch();
            cy.wait('@getRecords2').its('response.statusCode').should('eq', 200);
            sharedInstanceWithHoldingsIndexes.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
            });
            InventorySearchAndFilter.checkRowsCount(sharedInstanceWithHoldingsIndexes.length);
          }

          searchAndVerify();

          InventorySearchAndFilter.switchToHoldings();
          InventorySearchAndFilter.holdingsTabIsDefault();
          searchAndVerify();

          InventorySearchAndFilter.switchToItem();
          InventorySearchAndFilter.itemTabIsDefault();
          searchAndVerify();
        },
      );
    });
  });
});
