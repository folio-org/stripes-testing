import Permissions from '../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import InventoryInstances, {
  searchHoldingsOptions,
} from '../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import { INSTANCE_SOURCE_NAMES, ADVANCED_SEARCH_MODIFIERS } from '../../../../support/constants';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Consortia', () => {
      const randomPostfix = getRandomPostfix();
      const instancePrefix = `AT_C411748_Instance_${randomPostfix}`;
      const issnPrefix = `AT_C411748_ISSN_${randomPostfix}`;
      const callNumberPrefix = `AT_C411748_CallNumber_${randomPostfix}`;
      const helbyAccordionName = 'Held by';
      const searchOptions = {
        callNumber: searchHoldingsOptions[4],
        issn: searchHoldingsOptions[2],
        keyword: 'Keyword (title, contributor, identifier)',
      };
      const identifierTypeName = 'ISSN';
      const instancesData = [
        {
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.Consortia,
          holdingsAffiliations: [Affiliations.College],
          hasCallNumbers: true,
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.Consortia,
          holdingsAffiliations: [Affiliations.University],
          hasCallNumbers: false,
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.Consortia,
          holdingsAffiliations: [Affiliations.College, Affiliations.University],
          hasCallNumbers: true,
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.Consortia,
          holdingsAffiliations: [Affiliations.College],
          hasCallNumbers: false,
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.Consortia,
          holdingsAffiliations: [Affiliations.University],
          hasCallNumbers: true,
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.Consortia,
          holdingsAffiliations: [Affiliations.College, Affiliations.University],
          hasCallNumbers: false,
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.College,
          holdingsAffiliations: [Affiliations.College],
          hasCallNumbers: false,
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.College,
          holdingsAffiliations: [Affiliations.College],
          hasCallNumbers: true,
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.University,
          holdingsAffiliations: [Affiliations.University],
          hasCallNumbers: true,
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.University,
          holdingsAffiliations: [Affiliations.University],
          hasCallNumbers: false,
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

      before('Create user, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C411748');

        cy.createTempUser([Permissions.uiInventoryViewInstances.gui])
          .then((userProperties) => {
            user = userProperties;
            cy.assignAffiliationToUser(Affiliations.College, user.userId);

            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(user.userId, [
              Permissions.uiInventoryViewInstances.gui,
            ]);
            InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C411748');

            cy.setTenant(Affiliations.University);
            InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C411748');
          })
          .then(() => {
            cy.resetTenant();
            cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
              InventoryInstances.getIdentifierTypes({
                query: `name=="${identifierTypeName}"`,
              }).then((identifierType) => {
                instancesData.forEach((instanceData, index) => {
                  cy.setTenant(instanceData.affiliation);

                  if (instanceData.instanceSource === INSTANCE_SOURCE_NAMES.FOLIO) {
                    const instanceParams = {
                      instanceTypeId: instanceTypes[0].id,
                      title: `${instanceTitles[index]}`,
                    };
                    if (!instanceData.hasCallNumbers) {
                      instanceParams.identifiers = [
                        {
                          value: `${issnPrefix}_${index}`,
                          identifierTypeId: identifierType.id,
                        },
                      ];
                    }
                    InventoryInstances.createFolioInstanceViaApi({
                      instance: instanceParams,
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
                    if (!instanceData.hasCallNumbers) {
                      marcInstanceFields.push({
                        tag: '022',
                        content: `$a ${issnPrefix}_${index}`,
                        indicators: ['\\', '\\'],
                      });
                    }

                    cy.createMarcBibliographicViaAPI(
                      QuickMarcEditor.defaultValidLdr,
                      marcInstanceFields,
                    ).then((instanceId) => {
                      instanceData.instanceId = instanceId;
                    });
                  }
                });
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
                if (instanceData.hasCallNumbers) {
                  holdingsParams.callNumber = `${callNumberPrefix}_${instanceIndex}_${holdingsIndex}`;
                }
                InventoryHoldings.createHoldingRecordViaApi(holdingsParams);
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
            InventorySearchAndFilter.switchToHoldings();
            InventorySearchAndFilter.holdingsTabIsDefault();
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
        'C411748 Search for Shared/Local records by "Advanced search" search option from "Central" and "Member 1" tenant ("Call number, normalized" and "ISSN" search options) (consortia) (spitfire)',
        { tags: ['extendedPathECS', 'spitfire', 'C411748'] },
        () => {
          function verifyAdvancedSearch(expectedIndexes) {
            InventoryInstances.clickAdvSearchButton();
            InventoryInstances.fillAdvSearchRow(
              0,
              callNumberPrefix,
              ADVANCED_SEARCH_MODIFIERS.EXACT_PHRASE,
              searchOptions.callNumber,
            );
            InventoryInstances.checkAdvSearchModalValues(
              0,
              callNumberPrefix,
              ADVANCED_SEARCH_MODIFIERS.EXACT_PHRASE,
              searchOptions.callNumber,
            );
            InventoryInstances.fillAdvSearchRow(
              1,
              issnPrefix,
              ADVANCED_SEARCH_MODIFIERS.CONTAINS_ALL,
              searchOptions.issn,
              'OR',
            );
            InventoryInstances.checkAdvSearchModalValues(
              1,
              issnPrefix,
              ADVANCED_SEARCH_MODIFIERS.CONTAINS_ALL,
              searchOptions.issn,
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
              callNumberPrefix,
              ADVANCED_SEARCH_MODIFIERS.EXACT_PHRASE,
              searchOptions.callNumber,
            );
            InventoryInstances.checkAdvSearchModalValues(
              1,
              issnPrefix,
              ADVANCED_SEARCH_MODIFIERS.CONTAINS_ALL,
              searchOptions.issn,
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

          InventorySearchAndFilter.switchToHoldings();
          InventorySearchAndFilter.holdingsTabIsDefault();
          InventorySearchAndFilter.clearDefaultFilter(helbyAccordionName);

          verifyAdvancedSearch(expectedInstanceIndexesMember);
        },
      );
    });
  });
});
