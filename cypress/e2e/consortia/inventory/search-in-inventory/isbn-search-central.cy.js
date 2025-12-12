import Permissions from '../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import InventoryInstances, {
  searchInstancesOptions,
} from '../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import { INSTANCE_SOURCE_NAMES } from '../../../../support/constants';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import NewLocation from '../../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Consortia', () => {
      const randomPostfix = getRandomPostfix();
      const instancePrefix = `AT_C411618_Instance_${randomPostfix}`;
      const identifierValue = `AT_C411618_Identifier_${randomPostfix}`;
      const searchOptions = {
        identifierAll: 'Identifier (all)',
        isbn: 'ISBN',
        keywordInstances: searchInstancesOptions[0],
      };
      const identifierTypeName = 'ISBN';
      const identifiersData = [
        {
          identifierValue,
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.Consortia,
          hasHoldings: false,
        },
        {
          identifierValue,
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.Consortia,
          hasHoldings: true,
        },
        {
          identifierValue,
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.Consortia,
          hasHoldings: false,
        },
        {
          identifierValue,
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.Consortia,
          hasHoldings: true,
        },
        {
          identifierValue,
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.College,
          hasHoldings: true,
        },
        {
          identifierValue,
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.College,
          hasHoldings: true,
        },
      ];
      const instanceTitles = Array.from(
        { length: identifiersData.length },
        (_, i) => `${instancePrefix}_${i}`,
      );
      const sharedInstanceIndexes = identifiersData
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => item.affiliation === Affiliations.Consortia)
        .map(({ index }) => index);
      let user;
      let memberLocation;

      before('Create user, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C411618');

        cy.createTempUser([Permissions.uiInventoryViewInstances.gui])
          .then((userProperties) => {
            user = userProperties;

            cy.setTenant(Affiliations.College);
            InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C411618');
          })
          .then(() => {
            cy.resetTenant();
            cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
              InventoryInstances.getIdentifierTypes({
                query: `name=="${identifierTypeName}"`,
              }).then((identifierType) => {
                identifiersData.forEach((identifierData, index) => {
                  cy.setTenant(identifierData.affiliation);

                  if (identifierData.instanceSource === INSTANCE_SOURCE_NAMES.FOLIO) {
                    InventoryInstances.createFolioInstanceViaApi({
                      instance: {
                        instanceTypeId: instanceTypes[0].id,
                        title: `${instanceTitles[index]}`,
                        identifiers: [
                          {
                            value: identifierData.identifierValue,
                            identifierTypeId: identifierType.id,
                          },
                        ],
                      },
                    }).then((createdInstanceData) => {
                      identifierData.instanceId = createdInstanceData.instanceId;
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
                      {
                        tag: '020',
                        content: `$a ${identifierData.identifierValue}`,
                        indicators: ['\\', '\\'],
                      },
                    ];

                    cy.createMarcBibliographicViaAPI(
                      QuickMarcEditor.defaultValidLdr,
                      marcInstanceFields,
                    ).then((instanceId) => {
                      identifierData.instanceId = instanceId;
                    });
                  }
                });
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
          })
          .then(() => {
            identifiersData.forEach((identifierData) => {
              if (identifierData.hasHoldings) {
                cy.setTenant(Affiliations.College);
                InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
                  InventoryHoldings.createHoldingRecordViaApi({
                    instanceId: identifierData.instanceId,
                    permanentLocationId: memberLocation.id,
                    sourceId: folioSource.id,
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
            InventorySearchAndFilter.selectSearchOption(searchOptions.identifierAll);
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

        cy.setTenant(Affiliations.College);
        NewLocation.deleteInstitutionCampusLibraryLocationViaApi(
          memberLocation.institutionId,
          memberLocation.campusId,
          memberLocation.libraryId,
          memberLocation.id,
        );
      });

      it(
        'C411618 Search for Shared/Local records by "Identifier (all)" ("Instance" tab) and "ISBN" search options from "Central" tenant (Instance, Holdings, Item tabs) (consortia) (spitfire)',
        { tags: ['extendedPathECS', 'spitfire', 'C411618'] },
        () => {
          InventorySearchAndFilter.fillInSearchQuery(identifierValue);
          InventorySearchAndFilter.clickSearch();
          sharedInstanceIndexes.forEach((instanceIndex) => {
            InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
          });
          InventorySearchAndFilter.checkRowsCount(sharedInstanceIndexes.length);

          InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
          InventorySearchAndFilter.verifyDefaultSearchOptionSelected(
            searchOptions.keywordInstances,
          );

          InventorySearchAndFilter.selectSearchOption(searchOptions.isbn);
          InventorySearchAndFilter.verifyDefaultSearchOptionSelected(searchOptions.isbn);

          InventorySearchAndFilter.fillInSearchQuery(identifierValue);
          InventorySearchAndFilter.clickSearch();
          sharedInstanceIndexes.forEach((instanceIndex) => {
            InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
          });
          InventorySearchAndFilter.checkRowsCount(sharedInstanceIndexes.length);

          InventorySearchAndFilter.switchToHoldings();
          InventorySearchAndFilter.holdingsTabIsDefault();
          InventorySearchAndFilter.checkSearchQueryText('');
          InventorySearchAndFilter.verifyResultPaneEmpty();

          InventorySearchAndFilter.selectSearchOption(searchOptions.isbn);
          InventorySearchAndFilter.verifyDefaultSearchOptionSelected(searchOptions.isbn);

          InventorySearchAndFilter.fillInSearchQuery(identifierValue);
          InventorySearchAndFilter.clickSearch();
          sharedInstanceIndexes.forEach((instanceIndex) => {
            InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
          });
          InventorySearchAndFilter.checkRowsCount(sharedInstanceIndexes.length);

          InventorySearchAndFilter.switchToItem();
          InventorySearchAndFilter.itemTabIsDefault();
          InventorySearchAndFilter.checkSearchQueryText('');
          InventorySearchAndFilter.verifyResultPaneEmpty();

          InventorySearchAndFilter.selectSearchOption(searchOptions.isbn);
          InventorySearchAndFilter.verifyDefaultSearchOptionSelected(searchOptions.isbn);

          InventorySearchAndFilter.fillInSearchQuery(identifierValue);
          InventorySearchAndFilter.clickSearch();
          sharedInstanceIndexes.forEach((instanceIndex) => {
            InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
          });
          InventorySearchAndFilter.checkRowsCount(sharedInstanceIndexes.length);
        },
      );
    });
  });
});
