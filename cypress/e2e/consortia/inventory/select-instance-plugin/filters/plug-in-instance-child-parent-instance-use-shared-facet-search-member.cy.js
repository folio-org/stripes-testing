import Permissions from '../../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Users from '../../../../../support/fragments/users/users';
import TopMenu from '../../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../../support/fragments/inventory/inventorySearchAndFilter';
import { INSTANCE_SOURCE_NAMES } from '../../../../../support/constants';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import SelectInstanceModal from '../../../../../support/fragments/orders/modals/selectInstanceModal';
import InstanceRecordEdit from '../../../../../support/fragments/inventory/instanceRecordEdit';
import InstanceRecordView from '../../../../../support/fragments/inventory/instanceRecordView';

describe('Inventory', () => {
  describe('Search in "Select instance" plugin', () => {
    describe('Filters', () => {
      describe('Consortia', () => {
        const randomPostfix = getRandomPostfix();
        const instancePrefix = `AT_C410701_Instance_${randomPostfix}`;
        const testInstanceTitle = `AT_C410701_Test_${randomPostfix}`;
        const heldbyAccordionName = 'Held by';
        const sharedAccordionName = 'Shared';
        const sourceAccordionName = 'Source';
        const instancesData = [
          {
            affiliation: Affiliations.Consortia,
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
            affiliation: Affiliations.College,
            instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
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
            affiliation: Affiliations.Consortia,
            instanceSource: INSTANCE_SOURCE_NAMES.MARC,
          },
          {
            affiliation: Affiliations.Consortia,
            instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
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
        const instanceIndexesLocal = instancesData
          .map((item, index) => ({ item, index }))
          .filter(({ item }) => item.affiliation === Affiliations.College)
          .map(({ index }) => index);
        const instanceIndexesSharedMarc = instancesData
          .map((item, index) => ({ item, index }))
          .filter(
            ({ item }) => item.affiliation === Affiliations.Consortia &&
              item.instanceSource === INSTANCE_SOURCE_NAMES.MARC,
          )
          .map(({ index }) => index);
        let user;
        let testInstanceId;

        before('Create user, data', () => {
          cy.resetTenant();
          cy.getAdminToken();

          cy.setTenant(Affiliations.College);
          cy.createTempUser([
            Permissions.uiInventoryViewInstances.gui,
            Permissions.uiInventoryViewCreateEditInstances.gui,
          ])
            .then((userProperties) => {
              user = userProperties;
              InventoryInstances.deleteInstanceByTitleViaApi('AT_C410701');

              cy.setTenant(Affiliations.University);
              InventoryInstances.deleteInstanceByTitleViaApi('AT_C410701');

              cy.resetTenant();
              InventoryInstances.deleteInstanceByTitleViaApi('AT_C410701');
            })
            .then(() => {
              cy.resetTenant();
              cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then(
                (instanceTypes) => {
                  cy.setTenant(Affiliations.College);
                  InventoryInstances.createFolioInstanceViaApi({
                    instance: {
                      instanceTypeId: instanceTypes[0].id,
                      title: testInstanceTitle,
                    },
                  }).then((createdInstanceData) => {
                    testInstanceId = createdInstanceData.instanceId;
                  });

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
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
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
          InventoryInstance.deleteInstanceViaApi(testInstanceId);

          cy.setTenant(Affiliations.University);
          InventoryInstances.deleteInstanceByTitleViaApi(instancePrefix);

          cy.resetTenant();
          InventoryInstances.deleteInstanceByTitleViaApi(instancePrefix);
        });

        it(
          'C410701 Adding child or parent "Instance" in "Inventory" app: Use "Shared" facet in "Member" tenant (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'C410701'] },
          () => {
            InventorySearchAndFilter.clearDefaultFilter(heldbyAccordionName);
            InventoryInstances.searchByTitle(testInstanceId);
            InventoryInstances.selectInstanceById(testInstanceId);
            InstanceRecordView.waitLoading();
            InstanceRecordView.edit();
            InstanceRecordEdit.waitLoading();

            InstanceRecordEdit.openAddChildInstanceModal();
            InventorySearchAndFilter.verifyAccordionExistance(sharedAccordionName);
            InventorySearchAndFilter.instanceTabIsDefault();

            InventorySearchAndFilter.switchToItem();
            InventorySearchAndFilter.itemTabIsDefault();
            InventorySearchAndFilter.verifyAccordionExistance(sharedAccordionName);
            InventorySearchAndFilter.verifyAccordionByNameExpanded(sharedAccordionName, false);

            InventorySearchAndFilter.clearDefaultFilter(heldbyAccordionName);
            SelectInstanceModal.searchByName(instancePrefix);
            InventorySearchAndFilter.verifyNumberOfSearchResults(instanceIndexesAllVisible.length);
            instanceIndexesAllVisible.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
            });

            InventorySearchAndFilter.toggleAccordionByName(sharedAccordionName);
            InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'Yes', false);
            InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'No', false);

            InventorySearchAndFilter.selectOptionInExpandedFilter(sharedAccordionName, 'No', true);
            InventorySearchAndFilter.verifyNumberOfSearchResults(instanceIndexesLocal.length);
            instanceIndexesLocal.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
            });
            InventorySearchAndFilter.checkNoSharedInstancesInResultList();

            InventorySearchAndFilter.selectOptionInExpandedFilter(sharedAccordionName, 'No', false);
            InventorySearchAndFilter.verifyNumberOfSearchResults(instanceIndexesAllVisible.length);
            instanceIndexesAllVisible.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
            });

            InventorySearchAndFilter.selectOptionInExpandedFilter(sharedAccordionName, 'Yes', true);
            InventorySearchAndFilter.verifyNumberOfSearchResults(instanceIndexesShared.length);
            instanceIndexesShared.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
            });
            InventorySearchAndFilter.checkSharedInstancesInResultList({ instancePlugin: true });

            InventorySearchAndFilter.selectOptionInExpandedFilter(sharedAccordionName, 'No', true);
            InventorySearchAndFilter.verifyNumberOfSearchResults(instanceIndexesAllVisible.length);
            instanceIndexesAllVisible.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySharedIconForResult(
                instanceTitles[instanceIndex],
                instanceIndexesShared.includes(instanceIndex),
              );
            });

            SelectInstanceModal.clickResetAllButton();
            SelectInstanceModal.checkTableContent();
            SelectInstanceModal.checkSearchInputCleared();
            InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'Yes', false);
            InventorySearchAndFilter.verifyCheckboxInAccordion(sharedAccordionName, 'No', false);

            InstanceRecordEdit.closeSelectInstanceModal();
            InstanceRecordEdit.waitLoading();
            InstanceRecordEdit.openAddParentInstanceModal();

            InventorySearchAndFilter.verifyAccordionExistance(sharedAccordionName);
            InventorySearchAndFilter.instanceTabIsDefault();

            InventorySearchAndFilter.clearDefaultFilter(heldbyAccordionName);
            SelectInstanceModal.searchByName(instancePrefix);
            InventorySearchAndFilter.verifyNumberOfSearchResults(instanceIndexesAllVisible.length);
            instanceIndexesAllVisible.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySharedIconForResult(
                instanceTitles[instanceIndex],
                instanceIndexesShared.includes(instanceIndex),
              );
            });

            InventorySearchAndFilter.toggleAccordionByName(sharedAccordionName);
            InventorySearchAndFilter.selectOptionInExpandedFilter(sharedAccordionName, 'Yes', true);
            InventorySearchAndFilter.verifyNumberOfSearchResults(instanceIndexesShared.length);
            instanceIndexesShared.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
            });
            InventorySearchAndFilter.checkSharedInstancesInResultList({ instancePlugin: true });

            InventorySearchAndFilter.toggleAccordionByName(sourceAccordionName);
            InventorySearchAndFilter.selectOptionInExpandedFilter(
              sourceAccordionName,
              INSTANCE_SOURCE_NAMES.MARC,
            );
            InventorySearchAndFilter.verifyNumberOfSearchResults(instanceIndexesSharedMarc.length);
            instanceIndexesSharedMarc.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySearchResult(instanceTitles[instanceIndex]);
            });
            InventorySearchAndFilter.checkSharedInstancesInResultList({ instancePlugin: true });
          },
        );
      });
    });
  });
});
