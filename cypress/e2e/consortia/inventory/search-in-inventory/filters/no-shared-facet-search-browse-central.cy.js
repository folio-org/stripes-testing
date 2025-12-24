import Permissions from '../../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Users from '../../../../../support/fragments/users/users';
import TopMenu from '../../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../../support/fragments/inventory/inventorySearchAndFilter';
import {
  INSTANCE_SOURCE_NAMES,
  ITEM_STATUS_NAMES,
  BROWSE_CALL_NUMBER_OPTIONS,
} from '../../../../../support/constants';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import InventoryHoldings from '../../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryItems from '../../../../../support/fragments/inventory/item/inventoryItems';
import BrowseContributors from '../../../../../support/fragments/inventory/search/browseContributors';
import BrowseSubjects from '../../../../../support/fragments/inventory/search/browseSubjects';
import BrowseCallNumber from '../../../../../support/fragments/inventory/search/browseCallNumber';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Filters', () => {
      describe('Consortia', () => {
        const randomPostfix = getRandomPostfix();
        const instancePrefix = `AT_C401728_Instance_${randomPostfix}`;
        const callNumberValue = `AT_C401728_CallNumber_${randomPostfix}`;
        const contributorValue = `AT_C401728_Contributor_${randomPostfix}`;
        const subjectValue = `AT_C401728_Subject_${randomPostfix}`;
        const contributorNameTypeName = 'Personal name';
        const sharedAccordionName = 'Shared';
        const browseOptions = {
          callNumbers: BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL,
          subjects: 'Subjects',
          contributors: 'Contributors',
        };

        const instancesData = [
          {
            instanceSource: INSTANCE_SOURCE_NAMES.MARC,
            affiliation: Affiliations.Consortia,
          },
          {
            instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
            affiliation: Affiliations.Consortia,
          },
          {
            instanceSource: INSTANCE_SOURCE_NAMES.MARC,
            affiliation: Affiliations.College,
          },
          {
            instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
            affiliation: Affiliations.College,
          },
        ];
        instancesData.forEach((instance) => {
          instance.itemHrids = [];
        });
        const instanceTitles = Array.from(
          { length: instancesData.length },
          (_, i) => `${instancePrefix}_${i}`,
        );
        let user;
        let location;
        let holdingsSourceId;
        let loanTypeId;
        let materialTypeId;

        before('Create user, data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C401728');

          cy.createTempUser([Permissions.uiInventoryViewInstances.gui])
            .then((userProperties) => {
              user = userProperties;
              cy.assignAffiliationToUser(Affiliations.College, user.userId);

              cy.setTenant(Affiliations.College);
              InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C401728');
            })
            .then(() => {
              cy.resetTenant();
              cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then(
                (instanceTypes) => {
                  BrowseContributors.getContributorNameTypes({
                    searchParams: { limit: 1, query: `name==${contributorNameTypeName}` },
                  }).then((contributorNameTypes) => {
                    instancesData.forEach((instanceData, index) => {
                      cy.setTenant(instanceData.affiliation);

                      if (instanceData.instanceSource === INSTANCE_SOURCE_NAMES.FOLIO) {
                        InventoryInstances.createFolioInstanceViaApi({
                          instance: {
                            instanceTypeId: instanceTypes[0].id,
                            title: `${instanceTitles[index]}`,
                            subjects: [{ value: subjectValue }],
                            contributors: [
                              {
                                name: contributorValue,
                                contributorNameTypeId: contributorNameTypes[0].id,
                                contributorTypeText: '',
                                primary: false,
                              },
                            ],
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
                          {
                            tag: '600',
                            content: `$a ${subjectValue}`,
                            indicators: ['\\', '\\'],
                          },
                          {
                            tag: '700',
                            content: `$a ${contributorValue}`,
                            indicators: ['\\', '\\'],
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
                },
              );
            })
            .then(() => {
              cy.setTenant(Affiliations.College);
              cy.getLocations({
                limit: 1,
                query: '(isActive=true and name<>"AT_*" and name<>"auto*")',
              }).then((res) => {
                location = res;
              });
              InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
                holdingsSourceId = folioSource.id;
              });
              cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((loanTypes) => {
                loanTypeId = loanTypes[0].id;
              });
              cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((res) => {
                materialTypeId = res.id;
              });
            })
            .then(() => {
              cy.setTenant(Affiliations.College);
              instancesData.forEach((instanceData) => {
                InventoryHoldings.createHoldingRecordViaApi({
                  instanceId: instanceData.instanceId,
                  permanentLocationId: location.id,
                  sourceId: holdingsSourceId,
                }).then((holding) => {
                  InventoryItems.createItemViaApi({
                    holdingsRecordId: holding.id,
                    materialType: { id: materialTypeId },
                    permanentLoanType: { id: loanTypeId },
                    status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                    itemLevelCallNumber: callNumberValue,
                  }).then((item) => {
                    instanceData.itemHrids.push(item.hrid);
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
              InventorySearchAndFilter.instanceTabIsDefault();
              InventorySearchAndFilter.validateSearchTabIsDefault();
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
          'C401728 Verify that "Shared" facet is not displayed in "Central" tenant (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'C401728'] },
          () => {
            InventorySearchAndFilter.verifyAccordionExistance(sharedAccordionName, false);

            InventorySearchAndFilter.fillInSearchQuery('*');
            InventorySearchAndFilter.clickSearch();
            InventorySearchAndFilter.verifyResultListExists();
            InventorySearchAndFilter.verifyAccordionExistance(sharedAccordionName, false);
            InventorySearchAndFilter.checkSharedInstancesInResultList();

            InventoryInstances.selectInstance();
            InventoryInstance.waitLoading();
            InventoryInstance.checkSharedTextInDetailView();

            InventorySearchAndFilter.closeInstanceDetailPane();
            InventorySearchAndFilter.checkSharedInstancesInResultList();

            InventorySearchAndFilter.switchToHoldings();
            InventorySearchAndFilter.holdingsTabIsDefault();
            InventorySearchAndFilter.checkSearchQueryText('');
            InventorySearchAndFilter.verifyResultPaneEmpty();
            InventorySearchAndFilter.verifyAccordionExistance(sharedAccordionName, false);

            InventorySearchAndFilter.fillInSearchQuery('*');
            InventorySearchAndFilter.clickSearch();
            InventorySearchAndFilter.verifyResultListExists();
            InventorySearchAndFilter.verifyAccordionExistance(sharedAccordionName, false);
            InventorySearchAndFilter.checkSharedInstancesInResultList();

            InventorySearchAndFilter.switchToItem();
            InventorySearchAndFilter.itemTabIsDefault();
            InventorySearchAndFilter.checkSearchQueryText('');
            InventorySearchAndFilter.verifyResultPaneEmpty();
            InventorySearchAndFilter.verifyAccordionExistance(sharedAccordionName, false);

            InventorySearchAndFilter.fillInSearchQuery('*');
            InventorySearchAndFilter.clickSearch();
            InventorySearchAndFilter.verifyResultListExists();
            InventorySearchAndFilter.verifyAccordionExistance(sharedAccordionName, false);
            InventorySearchAndFilter.checkSharedInstancesInResultList();

            InventorySearchAndFilter.switchToBrowseTab();
            InventorySearchAndFilter.validateBrowseToggleIsSelected();
            InventorySearchAndFilter.checkBrowseSearchInputFieldContent('');
            InventorySearchAndFilter.verifyBrowseResultListExists(false);
            InventorySearchAndFilter.verifyAccordionExistance(sharedAccordionName, false);

            BrowseCallNumber.waitForCallNumberToAppear(callNumberValue);
            BrowseSubjects.waitForSubjectToAppear(subjectValue);
            BrowseContributors.waitForContributorToAppear(contributorValue);

            InventorySearchAndFilter.selectBrowseOption(browseOptions.callNumbers);
            InventorySearchAndFilter.checkBrowseOptionSelected(browseOptions.callNumbers);
            InventorySearchAndFilter.verifyAccordionExistance(sharedAccordionName, false);

            InventorySearchAndFilter.browseSearch(callNumberValue);
            InventorySearchAndFilter.verifyBrowseResultListExists(true);
            InventorySearchAndFilter.verifyAccordionExistance(sharedAccordionName, false);

            InventorySearchAndFilter.selectBrowseOption(browseOptions.contributors);
            InventorySearchAndFilter.checkBrowseOptionSelected(browseOptions.contributors);
            InventorySearchAndFilter.verifyAccordionExistance(sharedAccordionName, false);

            InventorySearchAndFilter.browseSearch(contributorValue);
            InventorySearchAndFilter.verifyBrowseResultListExists(true);
            InventorySearchAndFilter.verifyAccordionExistance(sharedAccordionName, false);

            InventorySearchAndFilter.selectBrowseOption(browseOptions.subjects);
            InventorySearchAndFilter.checkBrowseOptionSelected(browseOptions.subjects);
            InventorySearchAndFilter.verifyAccordionExistance(sharedAccordionName, false);

            InventorySearchAndFilter.browseSearch(subjectValue);
            InventorySearchAndFilter.verifyBrowseResultListExists(true);
            InventorySearchAndFilter.verifyAccordionExistance(sharedAccordionName, false);
          },
        );
      });
    });
  });
});
