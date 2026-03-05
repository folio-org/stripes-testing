import Permissions from '../../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Users from '../../../../../support/fragments/users/users';
import TopMenu from '../../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../../support/fragments/inventory/inventorySearchAndFilter';
import { INSTANCE_SOURCE_NAMES } from '../../../../../support/constants';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import SelectInstanceModal from '../../../../../support/fragments/orders/modals/selectInstanceModal';
import Receiving from '../../../../../support/fragments/receiving/receiving';
import ReceivingEditForm from '../../../../../support/fragments/receiving/receivingEditForm';

describe('Inventory', () => {
  describe('Search in "Select instance" plugin', () => {
    describe('Filters', () => {
      describe('Consortia', () => {
        const randomPostfix = getRandomPostfix();
        const instancePrefix = `AT_C410698_Instance_${randomPostfix}`;
        const heldbyAccordionName = 'Held by';
        const sharedAccordionName = 'Shared';
        const instancesData = [
          {
            affiliation: Affiliations.Consortia,
            instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          },
          {
            affiliation: Affiliations.Consortia,
            instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          },
          {
            affiliation: Affiliations.Consortia,
            instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          },
          {
            affiliation: Affiliations.College,
            instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          },
          {
            affiliation: Affiliations.University,
            instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
          },
          {
            affiliation: Affiliations.Consortia,
            instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          },
          {
            affiliation: Affiliations.Consortia,
            instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          },
          {
            affiliation: Affiliations.Consortia,
            instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          },
          {
            affiliation: Affiliations.Consortia,
            instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          },
          {
            affiliation: Affiliations.Consortia,
            instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          },
          {
            affiliation: Affiliations.Consortia,
            instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          },
          {
            affiliation: Affiliations.College,
            instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          },
          {
            affiliation: Affiliations.College,
            instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          },
          {
            affiliation: Affiliations.University,
            instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          },
          {
            affiliation: Affiliations.University,
            instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          },
        ];
        const instanceTitles = Array.from(
          { length: instancesData.length },
          (_, i) => `${instancePrefix}_${i}`,
        );
        const instanceIndexesAllVisible = instancesData
          .map((item, index) => ({ item, index }))
          .filter(({ item }) => item.affiliation !== Affiliations.University)
          .map(({ index }) => index);
        const instanceIndexesShared = instancesData
          .map((item, index) => ({ item, index }))
          .filter(({ item }) => item.affiliation === Affiliations.Consortia)
          .map(({ index }) => index);
        let user;

        before('Create user, data', () => {
          cy.resetTenant();
          cy.getAdminToken();

          cy.setTenant(Affiliations.College);
          cy.createTempUser([
            Permissions.uiInventoryViewInstances.gui,
            Permissions.uiReceivingViewEditCreate.gui,
          ])
            .then((userProperties) => {
              user = userProperties;
              InventoryInstances.deleteInstanceByTitleViaApi('AT_C410698');

              cy.setTenant(Affiliations.University);
              InventoryInstances.deleteInstanceByTitleViaApi('AT_C410698');

              cy.resetTenant();
              cy.assignPermissionsToExistingUser(user.userId, [
                Permissions.uiReceivingViewEditCreate.gui,
              ]);
              InventoryInstances.deleteInstanceByTitleViaApi('AT_C410698');
            })
            .then(() => {
              cy.resetTenant();
              cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then(
                (instanceTypes) => {
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
                },
              );
            })
            .then(() => {
              cy.setTenant(Affiliations.College);
              cy.login(user.username, user.password, {
                path: TopMenu.receivingPath,
                waiter: Receiving.waitLoading,
              });
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
            });
        });

        after('Delete user, data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);
          Users.deleteViaApi(user.userId);
          InventoryInstances.deleteInstanceByTitleViaApi(instancePrefix);

          cy.setTenant(Affiliations.University);
          InventoryInstances.deleteInstanceByTitleViaApi(instancePrefix);

          cy.resetTenant();
          InventoryInstances.deleteInstanceByTitleViaApi(instancePrefix);
        });

        it(
          'C410698 "Title look-up" plugin in "Receiving" app: Use "Shared" facet in "Member" tenant (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'C410698'] },
          () => {
            Receiving.clickNewTitleOption();
            ReceivingEditForm.waitLoading();

            Receiving.clickTitleLookUpButton();
            SelectInstanceModal.waitLoading();
            InventorySearchAndFilter.verifyAccordionExistance(sharedAccordionName);
            InventorySearchAndFilter.instanceTabIsDefault();

            InventorySearchAndFilter.switchToHoldings();
            InventorySearchAndFilter.holdingsTabIsDefault();
            InventorySearchAndFilter.clearDefaultFilter(heldbyAccordionName);
            InventorySearchAndFilter.toggleAccordionByName(sharedAccordionName);
            InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'Yes', false);
            InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'No', false);

            SelectInstanceModal.searchByName(instancePrefix);
            InventorySearchAndFilter.verifyNumberOfSearchResults(instanceIndexesAllVisible.length);
            instanceIndexesAllVisible.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
              InventorySearchAndFilter.verifySharedIconForResult(
                instanceTitles[instanceIndex],
                instanceIndexesShared.includes(instanceIndex),
              );
            });
            InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'Yes', false);
            InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'No', false);

            InventorySearchAndFilter.selectOptionInExpandedFilter(sharedAccordionName, 'Yes', true);
            InventorySearchAndFilter.verifyNumberOfSearchResults(instanceIndexesShared.length);
            instanceIndexesShared.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
            });
            InventorySearchAndFilter.checkSharedInstancesInResultList({ instancePlugin: true });

            SelectInstanceModal.clickResetAllButton();
            SelectInstanceModal.checkTableContent();
            SelectInstanceModal.checkSearchInputCleared();
            InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'Yes', false);
            InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'No', false);

            InventorySearchAndFilter.clearDefaultFilter(heldbyAccordionName);
            cy.intercept('/search/instances?*').as('getInstances');
            InventorySearchAndFilter.selectOptionInExpandedFilter(sharedAccordionName, 'No', true);
            cy.wait('@getInstances').its('response.statusCode').should('eq', 200);
            InventorySearchAndFilter.verifyResultListExists();
            InventorySearchAndFilter.checkNoSharedInstancesInResultList({ instancePlugin: true });
          },
        );
      });
    });
  });
});
