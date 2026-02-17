import Permissions from '../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import { INSTANCE_SOURCE_NAMES } from '../../../../support/constants';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import BrowseClassifications from '../../../../support/fragments/inventory/search/browseClassifications';
import BrowseContributors from '../../../../support/fragments/inventory/search/browseContributors';
import BrowseCallNumber from '../../../../support/fragments/inventory/search/browseCallNumber';

describe('Inventory', () => {
  describe('Contributors Browse', () => {
    describe('Consortia', () => {
      const randomPostfix = getRandomPostfix();
      const instancePrefix = `AT_C402378_Instance_${randomPostfix}`;
      const contributorPrefix = `AT_C402378_Contributor_${randomPostfix}`;
      const sharedAccordionName = 'Shared';
      const instancesData = [
        {
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.Consortia,
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.Consortia,
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          affiliation: Affiliations.College,
        },
        {
          instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          affiliation: Affiliations.College,
        },
      ];
      const instanceTitles = Array.from(
        { length: instancesData.length },
        (_, i) => `${instancePrefix}_${i}`,
      );
      const contributors = Array.from(
        { length: instancesData.length },
        (_, i) => `${contributorPrefix}_${i}`,
      );

      let contributorNameTypeId;
      let user;

      before('Create user, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        cy.createTempUser([Permissions.uiInventoryViewInstances.gui])
          .then((userProperties) => {
            user = userProperties;
            InventoryInstances.deleteInstanceByTitleViaApi('AT_C402378');

            BrowseContributors.getContributorNameTypes().then((contributorNameTypes) => {
              contributorNameTypeId = contributorNameTypes[0].id;
            });
          })
          .then(() => {
            cy.resetTenant();
            InventoryInstances.deleteInstanceByTitleViaApi('AT_C402378');

            cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
              instancesData.forEach((instanceData, index) => {
                cy.setTenant(instanceData.affiliation);

                if (instanceData.instanceSource === INSTANCE_SOURCE_NAMES.FOLIO) {
                  InventoryInstances.createFolioInstanceViaApi({
                    instance: {
                      instanceTypeId: instanceTypes[0].id,
                      title: `${instanceTitles[index]}`,
                      contributors: [
                        {
                          name: contributors[index],
                          contributorNameTypeId,
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
                      tag: '700',
                      content: `$a ${contributors[index]}`,
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
          })
          .then(() => {
            cy.setTenant(Affiliations.College);
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
            InventorySearchAndFilter.selectBrowseContributors();
          });
      });

      after('Delete user, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        Users.deleteViaApi(user.userId);
        InventoryInstances.deleteInstanceByTitleViaApi(instancePrefix);

        cy.resetTenant();
        InventoryInstances.deleteInstanceByTitleViaApi(instancePrefix);
      });

      it(
        'C402378 Apply "Shared" facet when Browse for same contributors without executed search (consortia) (spitfire)',
        { tags: ['extendedPathECS', 'spitfire', 'C402378'] },
        () => {
          contributors.forEach((contributor) => {
            BrowseContributors.waitForContributorToAppear(contributor);
          });

          InventorySearchAndFilter.toggleAccordionByName(sharedAccordionName);
          InventorySearchAndFilter.verifyCheckboxesWithCountersExistInAccordion(
            sharedAccordionName,
          );
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'Yes', false);
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'No', false);

          InventorySearchAndFilter.selectOptionInExpandedFilter(sharedAccordionName, 'No');
          InventorySearchAndFilter.verifyBrowseResultListExists();
          InventorySearchAndFilter.verifyCheckboxesWithCountersExistInAccordion(
            sharedAccordionName,
          );
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'Yes', false);
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'No', true);

          BrowseCallNumber.clickOnResultByRowIndex(1);
          InventorySearchAndFilter.validateSearchTabIsDefault();
          InventorySearchAndFilter.verifyResultListExists();
          InventorySearchAndFilter.checkNoSharedInstancesInResultList();

          InventorySearchAndFilter.switchToBrowseTab();
          InventorySearchAndFilter.validateBrowseToggleIsSelected();
          InventorySearchAndFilter.verifyBrowseResultListExists();
          InventorySearchAndFilter.toggleAccordionByName(sharedAccordionName);
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'No', true);

          InventorySearchAndFilter.selectOptionInExpandedFilter(sharedAccordionName, 'No', false);
          InventorySearchAndFilter.verifyBrowseResultListExists(false);
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'Yes', false);
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'No', false);

          InventorySearchAndFilter.selectOptionInExpandedFilter(sharedAccordionName, 'Yes');
          InventorySearchAndFilter.verifyBrowseResultListExists();
          InventorySearchAndFilter.verifyCheckboxesWithCountersExistInAccordion(
            sharedAccordionName,
          );
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'Yes', true);
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'No', false);

          BrowseCallNumber.clickOnResultByRowIndex(1);
          InventorySearchAndFilter.validateSearchTabIsDefault();
          InventorySearchAndFilter.verifyResultListExists();
          InventorySearchAndFilter.checkSharedInstancesInResultList();

          InventorySearchAndFilter.switchToBrowseTab();
          InventorySearchAndFilter.validateBrowseToggleIsSelected();
          InventorySearchAndFilter.verifyBrowseResultListExists();
          InventorySearchAndFilter.toggleAccordionByName(sharedAccordionName);
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'Yes', true);

          InventorySearchAndFilter.selectOptionInExpandedFilter(sharedAccordionName, 'No');
          InventorySearchAndFilter.verifyBrowseResultListExists();
          InventorySearchAndFilter.verifyCheckboxesWithCountersExistInAccordion(
            sharedAccordionName,
          );
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'Yes', true);
          InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'No', true);

          BrowseClassifications.checkPaginationButtonsShown();
          BrowseClassifications.getNextPaginationButtonState().then((nextEnabled) => {
            BrowseClassifications.getPreviousPaginationButtonState().then((previousEnabled) => {
              if (nextEnabled || previousEnabled) {
                if (nextEnabled) BrowseCallNumber.clickNextPaginationButton();
                else if (previousEnabled) BrowseCallNumber.clickPreviousPaginationButton();
                cy.wait(2000);

                InventorySearchAndFilter.verifyBrowseResultListExists();
                InventorySearchAndFilter.verifyCheckboxesWithCountersExistInAccordion(
                  sharedAccordionName,
                );
                InventorySearchAndFilter.verifyCheckboxInAccordion(
                  sharedAccordionName,
                  'Yes',
                  true,
                );
                InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'No', true);
              }
            });
          });
        },
      );
    });
  });
});
