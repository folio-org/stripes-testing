import Permissions from '../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseContributors from '../../../../support/fragments/inventory/search/browseContributors';
import { INSTANCE_SOURCE_NAMES } from '../../../../support/constants';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';

describe('Inventory', () => {
  describe('Contributors Browse', () => {
    describe('Consortia', () => {
      const randomPostfix = getRandomPostfix();
      const instancePrefix = `AT_C410752_MarcBibInstance_${randomPostfix}`;
      const contributorPrefix = `AT_C410752_Contributor_${randomPostfix}`;
      const contributorBrowseoption = 'Contributors';
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
      const sharedContributors = contributorsData.filter(
        (c) => c.affiliation === Affiliations.Consortia,
      );
      const localContributors = contributorsData.filter(
        (c) => c.affiliation === Affiliations.College,
      );
      let user;

      before('Create user, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        InventoryInstances.deleteInstanceByTitleViaApi('AT_C410752');

        cy.createTempUser([Permissions.uiInventoryViewInstances.gui])
          .then((userProperties) => {
            user = userProperties;

            cy.setTenant(Affiliations.College);
            InventoryInstances.deleteInstanceByTitleViaApi('AT_C410752');
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
        Users.deleteViaApi(user.userId);
        InventoryInstances.deleteInstanceByTitleViaApi(instancePrefix);
        cy.setTenant(Affiliations.College);
        InventoryInstances.deleteInstanceByTitleViaApi(instancePrefix);
      });

      it(
        'C410752 Only contributors from "Shared" Instance records are shown in the browse result list on Central tenant (consortia) (spitfire)',
        { tags: ['extendedPathECS', 'spitfire', 'C410752'] },
        () => {
          InventorySearchAndFilter.switchToBrowseTab();
          InventorySearchAndFilter.selectBrowseOption(contributorBrowseoption);

          sharedContributors.forEach((contributor) => {
            BrowseContributors.waitForContributorToAppear(contributor.contributorValue);
          });

          BrowseContributors.browse(contributorPrefix);
          BrowseContributors.checkNonExactMatchPlaceholder(contributorPrefix);
          sharedContributors.forEach((contributor) => {
            BrowseContributors.checkSearchResultRow(
              contributor.contributorValue,
              contributor.nameType,
              contributor.type,
              '1',
            );
          });
          localContributors.forEach((contributor) => {
            BrowseContributors.checkValueAbsentInResults(contributor.contributorValue);
          });

          BrowseContributors.browse(localContributors[0].contributorValue);
          BrowseContributors.checkNonExactMatchPlaceholder(localContributors[0].contributorValue);

          BrowseContributors.browse(sharedContributors[1].contributorValue);
          BrowseContributors.checkSearchResultRow(
            sharedContributors[1].contributorValue,
            sharedContributors[1].nameType,
            sharedContributors[1].type,
            '1',
            true,
          );

          BrowseContributors.openInstance({ name: sharedContributors[1].contributorValue });
          InventorySearchAndFilter.validateSearchTabIsDefault();
          InventorySearchAndFilter.checkRowsCount(1);
          InventorySearchAndFilter.verifySearchResult(`${instancePrefix}_1`);

          InventorySearchAndFilter.switchToBrowseTab();
          BrowseContributors.checkSearchResultRow(
            sharedContributors[1].contributorValue,
            sharedContributors[1].nameType,
            sharedContributors[1].type,
            '1',
            true,
          );

          BrowseContributors.openInstance({ name: sharedContributors[0].contributorValue });
          InventorySearchAndFilter.validateSearchTabIsDefault();
          InventorySearchAndFilter.checkRowsCount(1);
          InventorySearchAndFilter.verifySearchResult(`${instancePrefix}_0`);
        },
      );
    });
  });
});
