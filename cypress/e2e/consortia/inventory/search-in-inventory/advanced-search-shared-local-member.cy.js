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
      const instancePrefix = `AT_C411679_Instance_${randomPostfix}`;
      const contributorPrefix = `AT_C411679_Contributor_${randomPostfix}`;
      const subjectPrefix = `AT_C411679_Subject_${randomPostfix}`;
      const contributorSearchOption = 'Contributor';
      const subjectSearchOption = 'Subject';
      const titleSearchOption = 'Title (all)';
      const contributorNameTypeName = 'Personal name';
      const heldbyAccordionName = 'Held by';
      const recordsData = [
        {
          contributorValue: `${contributorPrefix} 1 Shared Marc`,
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.Consortia,
        },
        {
          subjectValue: `${subjectPrefix} 2 Shared Marc`,
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.Consortia,
          holdingsAffiliation: Affiliations.College,
        },
        {
          contributorValue: `${contributorPrefix} 3 Shared Marc`,
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.Consortia,
          holdingsAffiliation: Affiliations.University,
        },
        {
          subjectValue: `${subjectPrefix} 4 Shared Folio`,
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.Consortia,
        },
        {
          contributorValue: `${contributorPrefix} 5 Shared Folio`,
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.Consortia,
          holdingsAffiliation: Affiliations.College,
        },
        {
          subjectValue: `${subjectPrefix} 6 Shared Folio`,
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.Consortia,
          holdingsAffiliation: Affiliations.University,
        },
        {
          contributorValue: `${contributorPrefix} 7 Local Folio`,
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.College,
          holdingsAffiliation: Affiliations.College,
        },
        {
          subjectValue: `${subjectPrefix} 8 Local Marc`,
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.College,
          holdingsAffiliation: Affiliations.College,
        },
        {
          contributorValue: `${contributorPrefix} 9 Local Folio`,
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.University,
          holdingsAffiliation: Affiliations.University,
        },
        {
          subjectValue: `${subjectPrefix} 10 Local Marc`,
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.University,
          holdingsAffiliation: Affiliations.University,
        },
      ];
      const instanceTitles = Array.from(
        { length: recordsData.length },
        (_, i) => `${instancePrefix}_${i}`,
      );
      const expectedInstanceIndexes = recordsData
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => item.affiliation !== Affiliations.University)
        .map(({ index }) => index);
      let user;
      let member1Location;
      let member2Location;

      before('Create user, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C411679');

        cy.setTenant(Affiliations.College);
        cy.createTempUser([Permissions.uiInventoryViewInstances.gui])
          .then((userProperties) => {
            user = userProperties;

            InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C411679');
            cy.setTenant(Affiliations.University);
            InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C411679');
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
              member1Location = res;
            });
            cy.setTenant(Affiliations.University);
            cy.getLocations({
              limit: 1,
              query: '(isActive=true and name<>"AT_*" and name<>"auto*")',
            }).then((res) => {
              member2Location = res;
            });
          })
          .then(() => {
            recordsData.forEach((contributorData) => {
              if (contributorData.holdingsAffiliation) {
                const location =
                  contributorData.holdingsAffiliation === Affiliations.College
                    ? member1Location
                    : member2Location;
                cy.setTenant(contributorData.holdingsAffiliation);
                InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
                  InventoryHoldings.createHoldingRecordViaApi({
                    instanceId: contributorData.instanceId,
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
            InventorySearchAndFilter.clearDefaultFilter(heldbyAccordionName);
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
      });

      it(
        'C411679 Search for Shared/Local records by "Advanced search" search option from "Member" tenant (consortia) (spitfire)',
        { tags: ['extendedPathECS', 'spitfire', 'C411679'] },
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

          expectedInstanceIndexes.forEach((instanceIndex) => {
            InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
          });
          InventorySearchAndFilter.checkRowsCount(expectedInstanceIndexes.length);

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
          expectedInstanceIndexes.forEach((instanceIndex) => {
            InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
          });
          InventorySearchAndFilter.checkRowsCount(expectedInstanceIndexes.length);
        },
      );
    });
  });
});
