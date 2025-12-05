import Permissions from '../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseSubjects from '../../../../support/fragments/inventory/search/browseSubjects';
import BrowseContributors from '../../../../support/fragments/inventory/search/browseContributors';
import { INSTANCE_SOURCE_NAMES } from '../../../../support/constants';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';

describe('Inventory', () => {
  describe('Contributors Browse', () => {
    describe('Consortia', () => {
      const randomPostfix = getRandomPostfix();
      const instancePrefix = `AT_C402374_MarcBibInstance_${randomPostfix}`;
      const contributorPrefix = `AT_C402374_Contributor_${randomPostfix}`;
      const contributorBrowseoption = 'Contributors';
      const sharedAccordionName = 'Shared';
      const contributorsData = [
        {
          contributorValue: `${contributorPrefix} 1 Shared Folio`,
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.Consortia,
          nameType: 'Personal name',
          type: 'Actor',
        },
        {
          contributorValue: `${contributorPrefix} 2 Shared MARC`,
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.Consortia,
          nameType: 'Personal name',
          type: 'Author',
        },
        {
          contributorValue: `${contributorPrefix} 3 Local Member 1 Folio`,
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.College,
          nameType: 'Meeting name',
          type: 'Collector',
        },
        {
          contributorValue: `${contributorPrefix} 4 Local Member 1 MARC`,
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.College,
          nameType: 'Corporate name',
          type: 'Patron',
        },
        {
          contributorValue: `${contributorPrefix} 5 Local Member 2 Folio`,
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.University,
          nameType: 'Corporate name',
          type: 'Libelant',
        },
        {
          contributorValue: `${contributorPrefix} 6 Local Member 2 MARC`,
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.University,
          nameType: 'Meeting name',
          type: 'Surveyor',
        },
      ];
      const getMarcTagForNameType = (nameType) => {
        switch (nameType) {
          case 'Personal name':
            return '700';
          case 'Corporate name':
            return '710';
          case 'Meeting name':
            return '711';
          default:
            return null;
        }
      };
      const visibleSharedContributors = contributorsData.filter(
        (c) => c.affiliation === Affiliations.Consortia,
      );
      const visibleLocalContributors = contributorsData.filter(
        (c) => c.affiliation === Affiliations.College,
      );
      const notVisibleContributors = contributorsData.filter(
        (c) => c.affiliation === Affiliations.University,
      );
      let user;

      before('Create user, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        InventoryInstances.deleteInstanceByTitleViaApi('AT_C402374');
        cy.setTenant(Affiliations.College);
        InventoryInstances.deleteInstanceByTitleViaApi('AT_C402374');
        cy.createTempUser([Permissions.uiInventoryViewInstances.gui])
          .then((userProperties) => {
            user = userProperties;

            cy.setTenant(Affiliations.University);
            InventoryInstances.deleteInstanceByTitleViaApi('AT_C402374');
          })
          .then(() => {
            cy.resetTenant();
            cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
              BrowseContributors.getContributorNameTypes({ searchParams: { limit: 100 } }).then(
                (contributorNameTypes) => {
                  BrowseContributors.getContributorTypes({ searchParams: { limit: 500 } }).then(
                    (contributorTypes) => {
                      contributorsData.forEach((contributorData, index) => {
                        cy.setTenant(contributorData.affiliation);

                        if (contributorData.instanceSource === INSTANCE_SOURCE_NAMES.FOLIO) {
                          InventoryInstances.createFolioInstanceViaApi({
                            instance: {
                              instanceTypeId: instanceTypes[0].id,
                              title: `${instancePrefix}_${index}`,
                              contributors: [
                                {
                                  name: contributorData.contributorValue,
                                  contributorNameTypeId: contributorNameTypes.filter(
                                    (t) => t.name === contributorData.nameType,
                                  )[0].id,
                                  contributorTypeId: contributorTypes.filter(
                                    (t) => t.name === contributorData.type,
                                  )[0].id,
                                  contributorTypeText: '',
                                  primary: false,
                                },
                              ],
                            },
                          });
                        } else {
                          const marcInstanceFields = [
                            {
                              tag: '008',
                              content: QuickMarcEditor.defaultValid008Values,
                            },
                            {
                              tag: '245',
                              content: `$a ${instancePrefix}_${index}`,
                              indicators: ['1', '1'],
                            },
                            {
                              tag: getMarcTagForNameType(contributorData.nameType),
                              content: `$a ${contributorData.contributorValue} $e ${contributorData.type}`,
                              indicators: ['\\', '\\'],
                            },
                          ];

                          cy.createMarcBibliographicViaAPI(
                            QuickMarcEditor.defaultValidLdr,
                            marcInstanceFields,
                          );
                        }
                      });
                    },
                  );
                },
              );
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
        InventoryInstances.deleteInstanceByTitleViaApi(instancePrefix);
        cy.setTenant(Affiliations.College);
        Users.deleteViaApi(user.userId);
        InventoryInstances.deleteInstanceByTitleViaApi(instancePrefix);
        cy.setTenant(Affiliations.University);
        InventoryInstances.deleteInstanceByTitleViaApi(instancePrefix);
      });

      it(
        'C402374 Apply "Shared" facet when Browse for different contributors existing in different tenants (not exact match) (consortia) (spitfire)',
        { tags: ['extendedPathECS', 'spitfire', 'C402374'] },
        () => {
          InventorySearchAndFilter.switchToBrowseTab();
          InventorySearchAndFilter.selectBrowseOption(contributorBrowseoption);

          cy.setTenant(Affiliations.College);
          [...visibleLocalContributors, ...visibleSharedContributors].forEach((contributor) => {
            BrowseContributors.waitForContributorToAppear(contributor.contributorValue);
          });

          BrowseContributors.browse(contributorPrefix);
          BrowseContributors.checkNonExactMatchPlaceholder(contributorPrefix);
          [...visibleLocalContributors, ...visibleSharedContributors].forEach((contributor) => {
            BrowseContributors.checkSearchResultRow(
              contributor.contributorValue,
              contributor.nameType,
              contributor.type,
              '1',
            );
          });
          notVisibleContributors.forEach((contributor) => {
            BrowseContributors.checkValueAbsentInResults(contributor.contributorValue);
          });

          InventorySearchAndFilter.clickAccordionByName(sharedAccordionName);
          InventorySearchAndFilter.verifyAccordionByNameExpanded(sharedAccordionName);
          InventorySearchAndFilter.verifyCheckboxesWithCountersExistInAccordion(
            sharedAccordionName,
          );
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'Yes', false);
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'No', false);

          InventorySearchAndFilter.selectOptionInExpandedFilter(sharedAccordionName, 'No');
          BrowseContributors.checkNonExactMatchPlaceholder(contributorPrefix);
          visibleLocalContributors.forEach((contributor) => {
            BrowseContributors.checkSearchResultRow(
              contributor.contributorValue,
              contributor.nameType,
              contributor.type,
              '1',
            );
          });
          [...visibleSharedContributors, ...notVisibleContributors].forEach((contributor) => {
            BrowseContributors.checkValueAbsentInResults(contributor.contributorValue);
          });
          InventorySearchAndFilter.verifyCheckboxesWithCountersExistInAccordion(
            sharedAccordionName,
          );
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'Yes', false);
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'No', true);

          BrowseSubjects.verifyClickTakesToInventory(contributorsData[2].contributorValue);

          InventorySearchAndFilter.switchToBrowseTab();
          BrowseContributors.checkNonExactMatchPlaceholder(contributorPrefix);
          visibleLocalContributors.forEach((contributor) => {
            BrowseContributors.checkSearchResultRow(
              contributor.contributorValue,
              contributor.nameType,
              contributor.type,
              '1',
            );
          });
          [...visibleSharedContributors, ...notVisibleContributors].forEach((contributor) => {
            BrowseContributors.checkValueAbsentInResults(contributor.contributorValue);
          });
          InventorySearchAndFilter.clickAccordionByName(sharedAccordionName);
          InventorySearchAndFilter.verifyAccordionByNameExpanded(sharedAccordionName);
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'No', true);

          InventorySearchAndFilter.selectOptionInExpandedFilter(sharedAccordionName, 'No', false);
          BrowseContributors.checkNonExactMatchPlaceholder(contributorPrefix);
          [...visibleLocalContributors, ...visibleSharedContributors].forEach((contributor) => {
            BrowseContributors.checkSearchResultRow(
              contributor.contributorValue,
              contributor.nameType,
              contributor.type,
              '1',
            );
          });
          notVisibleContributors.forEach((contributor) => {
            BrowseContributors.checkValueAbsentInResults(contributor.contributorValue);
          });

          InventorySearchAndFilter.selectOptionInExpandedFilter(sharedAccordionName, 'Yes');
          BrowseContributors.checkNonExactMatchPlaceholder(contributorPrefix);
          visibleSharedContributors.forEach((contributor) => {
            BrowseContributors.checkSearchResultRow(
              contributor.contributorValue,
              contributor.nameType,
              contributor.type,
              '1',
            );
          });
          [...visibleLocalContributors, ...notVisibleContributors].forEach((contributor) => {
            BrowseContributors.checkValueAbsentInResults(contributor.contributorValue);
          });

          BrowseSubjects.verifyClickTakesToInventory(contributorsData[1].contributorValue);

          InventorySearchAndFilter.switchToBrowseTab();
          BrowseContributors.checkNonExactMatchPlaceholder(contributorPrefix);
          visibleSharedContributors.forEach((contributor) => {
            BrowseContributors.checkSearchResultRow(
              contributor.contributorValue,
              contributor.nameType,
              contributor.type,
              '1',
            );
          });
          [...visibleLocalContributors, ...notVisibleContributors].forEach((contributor) => {
            BrowseContributors.checkValueAbsentInResults(contributor.contributorValue);
          });
          InventorySearchAndFilter.clickAccordionByName(sharedAccordionName);
          InventorySearchAndFilter.verifyAccordionByNameExpanded(sharedAccordionName);
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'Yes', true);

          InventorySearchAndFilter.selectOptionInExpandedFilter(sharedAccordionName, 'No');
          BrowseContributors.checkNonExactMatchPlaceholder(contributorPrefix);
          [...visibleLocalContributors, ...visibleSharedContributors].forEach((contributor) => {
            BrowseContributors.checkSearchResultRow(
              contributor.contributorValue,
              contributor.nameType,
              contributor.type,
              '1',
            );
          });
          notVisibleContributors.forEach((contributor) => {
            BrowseContributors.checkValueAbsentInResults(contributor.contributorValue);
          });
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'Yes', true);
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'No', true);

          BrowseContributors.expandNameTypeSection();
          BrowseContributors.expandNameTypeMenu();
          BrowseContributors.selectNameTypeOption(contributorsData[3].nameType);
          BrowseContributors.checkNonExactMatchPlaceholder(contributorPrefix);
          BrowseContributors.checkSearchResultRow(
            contributorsData[3].contributorValue,
            contributorsData[3].nameType,
            contributorsData[3].type,
            '1',
          );
          contributorsData
            .filter((_, i) => i !== 3)
            .forEach((contributor) => {
              BrowseContributors.checkValueAbsentInResults(contributor.contributorValue);
            });
        },
      );
    });
  });
});
