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
      const instancePrefix = `AT_C411624_Instance_${randomPostfix}`;
      const identifierValue = `AT_C411624_Identifier_${randomPostfix}`;
      const searchOptions = {
        identifierAll: 'Identifier (all)',
        isbn: 'ISSN',
        keywordInstances: searchInstancesOptions[0],
      };
      const identifierTypeName = 'ISSN';
      const helbyAccordionName = 'Held by';
      const identifiersData = [
        {
          identifierValue,
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.Consortia,
          holdingsAffiliation: null,
        },
        {
          identifierValue,
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.Consortia,
          holdingsAffiliation: Affiliations.College,
        },
        {
          identifierValue,
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.Consortia,
          holdingsAffiliation: Affiliations.University,
        },
        {
          identifierValue,
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.Consortia,
          holdingsAffiliation: null,
        },
        {
          identifierValue,
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.Consortia,
          holdingsAffiliation: Affiliations.Consortia,
        },
        {
          identifierValue,
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.Consortia,
          holdingsAffiliation: Affiliations.University,
        },
        {
          identifierValue,
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.College,
          holdingsAffiliation: Affiliations.College,
        },
        {
          identifierValue,
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.College,
          holdingsAffiliation: Affiliations.College,
        },
        {
          identifierValue,
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.University,
          holdingsAffiliation: Affiliations.University,
        },
        {
          identifierValue,
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.University,
          holdingsAffiliation: Affiliations.University,
        },
      ];
      const instanceTitles = Array.from(
        { length: identifiersData.length },
        (_, i) => `${instancePrefix}_${i}`,
      );
      const expectedInstanceIndexes = identifiersData
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => item.affiliation !== Affiliations.University)
        .map(({ index }) => index);
      let user;
      let member1Location;
      let member2Location;

      before('Create user, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C411624');
        cy.setTenant(Affiliations.College);
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C411624');

        cy.createTempUser([Permissions.uiInventoryViewInstances.gui])
          .then((userProperties) => {
            user = userProperties;

            ServicePoints.getViaApi().then((servicePoint1) => {
              NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePoint1[0].id)).then(
                (res1) => {
                  member1Location = res1;

                  cy.setTenant(Affiliations.University);
                  InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C411624');

                  ServicePoints.getViaApi().then((servicePoint2) => {
                    NewLocation.createViaApi(
                      NewLocation.getDefaultLocation(servicePoint2[0].id),
                    ).then((res2) => {
                      member2Location = res2;
                    });
                  });
                },
              );
            });
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
                        tag: '022',
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
            identifiersData.forEach((identifierData) => {
              if (identifierData.hasHoldings) {
                cy.setTenant(identifierData.holdingsAffiliation);
                const location =
                  identifierData.holdingsAffiliation === Affiliations.College
                    ? member1Location
                    : member2Location;
                InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
                  InventoryHoldings.createHoldingRecordViaApi({
                    instanceId: identifierData.instanceId,
                    permanentLocationId: location.id,
                    sourceId: folioSource.id,
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
            InventorySearchAndFilter.selectSearchOption(searchOptions.identifierAll);
          });
      });

      after('Delete user, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        InventoryInstances.deleteFullInstancesByTitleViaApi(instancePrefix);
        cy.setTenant(Affiliations.College);
        InventoryInstances.deleteFullInstancesByTitleViaApi(instancePrefix);
        NewLocation.deleteInstitutionCampusLibraryLocationViaApi(
          member1Location.institutionId,
          member1Location.campusId,
          member1Location.libraryId,
          member1Location.id,
        );
        cy.setTenant(Affiliations.University);
        InventoryInstances.deleteFullInstancesByTitleViaApi(instancePrefix);
        NewLocation.deleteInstitutionCampusLibraryLocationViaApi(
          member2Location.institutionId,
          member2Location.campusId,
          member2Location.libraryId,
          member2Location.id,
        );
      });

      it(
        'C411624 Search for Shared/Local records by "Identifier (all)" ("Instance" tab) and "ISSN" search options from "Member" tenant (Instance, Holdings, Item tabs) (consortia) (spitfire)',
        { tags: ['extendedPathECS', 'spitfire', 'C411624'] },
        () => {
          InventorySearchAndFilter.clearDefaultFilter(helbyAccordionName);

          InventorySearchAndFilter.fillInSearchQuery(identifierValue);
          InventorySearchAndFilter.clickSearch();
          expectedInstanceIndexes.forEach((instanceIndex) => {
            InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
          });
          InventorySearchAndFilter.checkRowsCount(expectedInstanceIndexes.length);

          InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
          InventorySearchAndFilter.verifyDefaultSearchOptionSelected(
            searchOptions.keywordInstances,
          );

          InventorySearchAndFilter.clearDefaultFilter(helbyAccordionName);

          InventorySearchAndFilter.selectSearchOption(searchOptions.isbn);
          InventorySearchAndFilter.verifyDefaultSearchOptionSelected(searchOptions.isbn);

          InventorySearchAndFilter.fillInSearchQuery(identifierValue);
          InventorySearchAndFilter.clickSearch();
          expectedInstanceIndexes.forEach((instanceIndex) => {
            InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
          });
          InventorySearchAndFilter.checkRowsCount(expectedInstanceIndexes.length);

          InventorySearchAndFilter.switchToHoldings();
          InventorySearchAndFilter.holdingsTabIsDefault();
          InventorySearchAndFilter.checkSearchQueryText('');
          InventorySearchAndFilter.verifyResultPaneEmpty();

          InventorySearchAndFilter.clearDefaultFilter(helbyAccordionName);

          InventorySearchAndFilter.selectSearchOption(searchOptions.isbn);
          InventorySearchAndFilter.verifyDefaultSearchOptionSelected(searchOptions.isbn);

          InventorySearchAndFilter.fillInSearchQuery(identifierValue);
          InventorySearchAndFilter.clickSearch();
          expectedInstanceIndexes.forEach((instanceIndex) => {
            InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
          });
          InventorySearchAndFilter.checkRowsCount(expectedInstanceIndexes.length);

          InventorySearchAndFilter.switchToItem();
          InventorySearchAndFilter.itemTabIsDefault();
          InventorySearchAndFilter.checkSearchQueryText('');
          InventorySearchAndFilter.verifyResultPaneEmpty();

          InventorySearchAndFilter.clearDefaultFilter(helbyAccordionName);

          InventorySearchAndFilter.selectSearchOption(searchOptions.isbn);
          InventorySearchAndFilter.verifyDefaultSearchOptionSelected(searchOptions.isbn);

          InventorySearchAndFilter.fillInSearchQuery(identifierValue);
          InventorySearchAndFilter.clickSearch();
          expectedInstanceIndexes.forEach((instanceIndex) => {
            InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
          });
          InventorySearchAndFilter.checkRowsCount(expectedInstanceIndexes.length);
        },
      );
    });
  });
});
