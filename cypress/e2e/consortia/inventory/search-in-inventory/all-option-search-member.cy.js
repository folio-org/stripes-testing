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
      const instancePrefix = `AT_C411661_Instance_${randomPostfix}`;
      const shelvingTitleValue = `AT_C411661_ShelvingTitle_${randomPostfix}`;
      const barcodePrefix = `AT_C411661_Barcode_${randomPostfix}`;
      const allSearchOption = 'All';
      const helbyAccordionName = 'Held by';
      const instancesData = [
        {
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.Consortia,
          holdingsAffiliation: null,
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.Consortia,
          holdingsAffiliation: Affiliations.College,
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.Consortia,
          holdingsAffiliation: Affiliations.University,
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.Consortia,
          holdingsAffiliation: null,
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.Consortia,
          holdingsAffiliation: Affiliations.College,
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.Consortia,
          holdingsAffiliation: Affiliations.University,
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.College,
          holdingsAffiliation: Affiliations.College,
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.College,
          holdingsAffiliation: Affiliations.College,
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.University,
          holdingsAffiliation: Affiliations.University,
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.University,
          holdingsAffiliation: Affiliations.University,
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
      const expectedInstanceIndexes = instancesData
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => item.affiliation !== Affiliations.University)
        .map(({ index }) => index);
      const expectedInstanceWithHoldingsIndexes = instancesData
        .map((item, index) => ({ item, index }))
        .filter(
          ({ item }) => item.affiliation !== Affiliations.University && item.holdingsAffiliation,
        )
        .map(({ index }) => index);
      let user;
      let member1Location;
      let member2Location;
      let member1MaterialTypeId;
      let member2MaterialTypeId;
      let member1LoanTypeId;
      let member2LoanTypeId;
      let holdingsSourceId;

      before('Create user, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C411661');
        cy.setTenant(Affiliations.College);
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C411661');

        cy.createTempUser([Permissions.uiInventoryViewInstances.gui])
          .then((userProperties) => {
            user = userProperties;

            cy.setTenant(Affiliations.University);
            InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C411661');
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
                  member1Location = res;
                },
              );
            });
            InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
              holdingsSourceId = folioSource.id;
            });
            cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((res) => {
              member1LoanTypeId = res[0].id;
            });
            cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((matType) => {
              member1MaterialTypeId = matType.id;
            });
          })
          .then(() => {
            cy.setTenant(Affiliations.University);
            ServicePoints.getViaApi().then((servicePoint) => {
              NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePoint[0].id)).then(
                (res) => {
                  member2Location = res;
                },
              );
            });
            cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((res) => {
              member2LoanTypeId = res[0].id;
            });
            cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((matType) => {
              member2MaterialTypeId = matType.id;
            });
          })
          .then(() => {
            instancesData.forEach((instanceData, index) => {
              let location;
              let materialTypeId;
              let loanTypeId;
              if (instanceData.holdingsAffiliation) {
                cy.setTenant(instanceData.holdingsAffiliation);
                if (instanceData.holdingsAffiliation === Affiliations.College) {
                  location = member1Location;
                  materialTypeId = member1MaterialTypeId;
                  loanTypeId = member1LoanTypeId;
                } else {
                  location = member2Location;
                  materialTypeId = member2MaterialTypeId;
                  loanTypeId = member2LoanTypeId;
                }
                InventoryHoldings.createHoldingRecordViaApi({
                  instanceId: instanceData.instanceId,
                  permanentLocationId: location.id,
                  sourceId: holdingsSourceId,
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
            cy.setTenant(Affiliations.College);
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
          });
      });

      after('Delete user, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        Users.deleteViaApi(user.userId);
        InventoryInstances.deleteFullInstancesByTitleViaApi(instancePrefix);

        cy.setTenant(Affiliations.University);
        InventoryInstances.deleteFullInstancesByTitleViaApi(instancePrefix);

        cy.resetTenant();
        InventoryInstances.deleteFullInstancesByTitleViaApi(instancePrefix);

        cy.setTenant(Affiliations.College);
        NewLocation.deleteInstitutionCampusLibraryLocationViaApi(
          member1Location.institutionId,
          member1Location.campusId,
          member1Location.libraryId,
          member1Location.id,
        );

        cy.setTenant(Affiliations.University);
        NewLocation.deleteInstitutionCampusLibraryLocationViaApi(
          member2Location.institutionId,
          member2Location.campusId,
          member2Location.libraryId,
          member2Location.id,
        );
      });

      it(
        'C411661 Search for Shared/Local records by "All" search option from "Member" tenant (Instance, Holdings, Item tabs) (consortia) (spitfire)',
        { tags: ['extendedPathECS', 'spitfire', 'C411661'] },
        () => {
          function searchAndVerify() {
            InventorySearchAndFilter.verifyResultPaneEmpty();
            InventorySearchAndFilter.checkSearchQueryText('');

            InventorySearchAndFilter.clearDefaultFilter(helbyAccordionName);
            InventorySearchAndFilter.selectSearchOption(allSearchOption);

            InventorySearchAndFilter.fillInSearchQuery(instancePrefix);
            InventorySearchAndFilter.clickSearch();
            expectedInstanceIndexes.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
            });
            InventorySearchAndFilter.verifyNumberOfSearchResults(expectedInstanceIndexes.length);

            InventorySearchAndFilter.fillInSearchQuery(shelvingTitleValue);
            cy.intercept('GET', '/search/instances*').as('getRecords1');
            InventorySearchAndFilter.clickSearch();
            cy.wait('@getRecords1').its('response.statusCode').should('eq', 200);
            expectedInstanceWithHoldingsIndexes.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
            });
            InventorySearchAndFilter.verifyNumberOfSearchResults(
              expectedInstanceWithHoldingsIndexes.length,
            );

            InventorySearchAndFilter.fillInSearchQuery(`${barcodePrefix}*`);
            cy.intercept('GET', '/search/instances*').as('getRecords2');
            InventorySearchAndFilter.clickSearch();
            cy.wait('@getRecords2').its('response.statusCode').should('eq', 200);
            expectedInstanceWithHoldingsIndexes.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
            });
            InventorySearchAndFilter.verifyNumberOfSearchResults(
              expectedInstanceWithHoldingsIndexes.length,
            );
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
