import Permissions from '../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseContributors from '../../../../support/fragments/inventory/search/browseContributors';
import { INSTANCE_SOURCE_NAMES, ADVANCED_SEARCH_MODIFIERS } from '../../../../support/constants';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Consortia', () => {
      const randomPostfix = getRandomPostfix();
      const instancePrefix = `AT_C411675_Instance_${randomPostfix}`;
      const contributorPrefix = `AT_C411675_Contributor_${randomPostfix}`;
      const subjectPrefix = `AT_C411675_Subject_${randomPostfix}`;
      const contributorSearchOption = 'Contributor';
      const subjectSearchOption = 'Subject';
      const titleSearchOption = 'Title (all)';
      const contributorNameTypeName = 'Personal name';
      const recordsData = [
        {
          contributorValue: `${contributorPrefix} 1 Shared Marc`,
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.Consortia,
          hasHoldings: false,
        },
        {
          subjectValue: `${subjectPrefix} 2 Shared Marc`,
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.Consortia,
          hasHoldings: true,
        },
        {
          subjectValue: `${subjectPrefix} 3 Shared Folio`,
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.Consortia,
          hasHoldings: false,
        },
        {
          contributorValue: `${contributorPrefix} 4 Shared Folio`,
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.Consortia,
          hasHoldings: true,
        },
        {
          contributorValue: `${contributorPrefix} 5 Local Folio`,
          subjectValue: `${subjectPrefix} 5 Local Folio`,
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.College,
          hasHoldings: true,
        },
        {
          contributorValue: `${contributorPrefix} 6 Local Marc`,
          subjectValue: `${subjectPrefix} 6 Local Marc`,
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.College,
          hasHoldings: true,
        },
      ];
      const instanceTitles = Array.from(
        { length: recordsData.length },
        (_, i) => `${instancePrefix}_${i}`,
      );
      const sharedInstanceIndexes = recordsData
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => item.affiliation === Affiliations.Consortia)
        .map(({ index }) => index);
      let user;
      let memberLocation;

      before('Create user, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C411675');

        cy.createTempUser([Permissions.uiInventoryViewInstances.gui])
          .then((userProperties) => {
            user = userProperties;

            cy.setTenant(Affiliations.College);
            InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C411675');
          })
          .then(() => {
            cy.resetTenant();
            cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
              BrowseContributors.getContributorNameTypes({
                searchParams: { limit: 1, query: `name==${contributorNameTypeName}` },
              }).then((contributorNameTypes) => {
                recordsData.forEach((contributorData, index) => {
                  cy.setTenant(contributorData.affiliation);

                  if (contributorData.instanceSource === INSTANCE_SOURCE_NAMES.FOLIO) {
                    const folioInstance = {
                      instanceTypeId: instanceTypes[0].id,
                      title: `${instanceTitles[index]}`,
                    };
                    if (contributorData.contributorValue) {
                      folioInstance.contributors = [
                        {
                          name: contributorData.contributorValue,
                          contributorNameTypeId: contributorNameTypes[0].id,
                          contributorTypeText: '',
                          primary: false,
                        },
                      ];
                    }
                    if (contributorData.subjectValue) {
                      folioInstance.subjects = [{ value: contributorData.subjectValue }];
                    }
                    InventoryInstances.createFolioInstanceViaApi({
                      instance: folioInstance,
                    }).then((createdInstanceData) => {
                      contributorData.instanceId = createdInstanceData.instanceId;
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
                    if (contributorData.contributorValue) {
                      marcInstanceFields.push({
                        tag: '700',
                        content: `$a ${contributorData.contributorValue}`,
                        indicators: ['\\', '\\'],
                      });
                    }
                    if (contributorData.subjectValue) {
                      marcInstanceFields.push({
                        tag: '600',
                        content: `$a ${contributorData.subjectValue}`,
                        indicators: ['\\', '\\'],
                      });
                    }

                    cy.createMarcBibliographicViaAPI(
                      QuickMarcEditor.defaultValidLdr,
                      marcInstanceFields,
                    ).then((instanceId) => {
                      contributorData.instanceId = instanceId;
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
              memberLocation = res;
            });
          })
          .then(() => {
            recordsData.forEach((contributorData) => {
              if (contributorData.hasHoldings) {
                cy.setTenant(Affiliations.College);
                InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
                  InventoryHoldings.createHoldingRecordViaApi({
                    instanceId: contributorData.instanceId,
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
              authRefresh: true,
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
      });

      it(
        'C411675 Search for Shared/Local records by "Advanced search" search option from "Central" tenant (consortia) (spitfire)',
        { tags: ['extendedPathECS', 'spitfire', 'C411675'] },
        () => {
          InventoryInstances.clickAdvSearchButton();
          InventoryInstances.fillAdvSearchRow(
            0,
            contributorPrefix,
            ADVANCED_SEARCH_MODIFIERS.EXACT_PHRASE,
            contributorSearchOption,
          );
          InventoryInstances.checkAdvSearchModalValues(
            0,
            contributorPrefix,
            ADVANCED_SEARCH_MODIFIERS.EXACT_PHRASE,
            contributorSearchOption,
          );
          InventoryInstances.fillAdvSearchRow(
            1,
            subjectPrefix,
            ADVANCED_SEARCH_MODIFIERS.CONTAINS_ALL,
            subjectSearchOption,
            'OR',
          );
          InventoryInstances.checkAdvSearchModalValues(
            1,
            subjectPrefix,
            ADVANCED_SEARCH_MODIFIERS.CONTAINS_ALL,
            subjectSearchOption,
            'OR',
          );
          InventoryInstances.clickSearchBtnInAdvSearchModal();

          sharedInstanceIndexes.forEach((instanceIndex) => {
            InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
          });
          InventorySearchAndFilter.checkRowsCount(sharedInstanceIndexes.length);

          InventoryInstances.clickAdvSearchButton();
          InventoryInstances.fillAdvSearchRow(
            2,
            instancePrefix,
            ADVANCED_SEARCH_MODIFIERS.STARTS_WITH,
            titleSearchOption,
            'AND',
          );
          InventoryInstances.checkAdvSearchModalValues(
            2,
            instancePrefix,
            ADVANCED_SEARCH_MODIFIERS.STARTS_WITH,
            titleSearchOption,
            'AND',
          );
          cy.intercept('/search/instances*').as('searchInstances');
          InventoryInstances.clickSearchBtnInAdvSearchModal();

          cy.wait('@searchInstances');
          sharedInstanceIndexes.forEach((instanceIndex) => {
            InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
          });
          InventorySearchAndFilter.checkRowsCount(sharedInstanceIndexes.length);
        },
      );
    });
  });
});
