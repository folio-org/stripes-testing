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
import InventoryHoldings from '../../../../../support/fragments/inventory/holdings/inventoryHoldings';
import SelectInstanceModal from '../../../../../support/fragments/orders/modals/selectInstanceModal';
import InstanceRecordEdit from '../../../../../support/fragments/inventory/instanceRecordEdit';
import InstanceRecordView from '../../../../../support/fragments/inventory/instanceRecordView';

describe('Inventory', () => {
  describe('Search in "Select instance" plugin', () => {
    describe('Filters', () => {
      describe('Consortia', () => {
        const randomPostfix = getRandomPostfix();
        const instancePrefix = `AT_C402368_Instance_${randomPostfix}`;
        const testInstanceTitle = `AT_C402368_Test_${randomPostfix}`;
        const heldbyAccordionName = 'Held by';
        const sharedAccordionName = 'Shared';
        const sourceAccordionName = 'Source';
        const instancesData = [
          {
            affiliation: Affiliations.Consortia,
            instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
            holdingsAffiliations: [Affiliations.College],
          },
          {
            affiliation: Affiliations.Consortia,
            instanceSource: INSTANCE_SOURCE_NAMES.MARC,
            holdingsAffiliations: [Affiliations.College],
          },
          {
            affiliation: Affiliations.College,
            instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
            holdingsAffiliations: [Affiliations.College],
          },
          {
            affiliation: Affiliations.College,
            instanceSource: INSTANCE_SOURCE_NAMES.MARC,
            holdingsAffiliations: [Affiliations.College],
          },
          {
            affiliation: Affiliations.Consortia,
            instanceSource: INSTANCE_SOURCE_NAMES.FOLIO,
            holdingsAffiliations: [Affiliations.University],
          },
          {
            affiliation: Affiliations.University,
            instanceSource: INSTANCE_SOURCE_NAMES.MARC,
            holdingsAffiliations: [Affiliations.University],
          },
        ];
        const instanceTitles = Array.from(
          { length: instancesData.length },
          (_, i) => `${instancePrefix}_${i}`,
        );
        const instanceIndexesHelbyCollege = instancesData
          .map((item, index) => ({ item, index }))
          .filter(({ item }) => item.affiliation !== Affiliations.University)
          .filter(({ item }) => item.holdingsAffiliations.includes(Affiliations.College))
          .map(({ index }) => index);
        const instanceIndexesHelbyUniversity = instancesData
          .map((item, index) => ({ item, index }))
          .filter(({ item }) => item.affiliation !== Affiliations.University)
          .filter(({ item }) => item.holdingsAffiliations.includes(Affiliations.University))
          .map(({ index }) => index);
        const instanceIndexesAllVisible = instancesData
          .map((item, index) => ({ item, index }))
          .filter(({ item }) => item.affiliation !== Affiliations.University)
          .map(({ index }) => index);
        const instanceIndexesShared = instancesData
          .map((item, index) => ({ item, index }))
          .filter(({ item }) => item.affiliation === Affiliations.Consortia)
          .map(({ index }) => index);
        const folioInstanceIndexes = instancesData
          .map((item, index) => ({ item, index }))
          .filter(({ item }) => item.affiliation !== Affiliations.University)
          .filter(({ item }) => item.instanceSource === INSTANCE_SOURCE_NAMES.FOLIO)
          .map(({ index }) => index);
        let user;
        const locations = {
          [Affiliations.College]: null,
          [Affiliations.University]: null,
        };
        let holdingsSourceId;
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
              InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C402368');

              cy.setTenant(Affiliations.University);
              InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C402368');

              cy.resetTenant();
              InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C402368');
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
              instancesData.forEach((instanceData) => {
                instanceData.holdingsAffiliations.forEach((holdingsAffiliation) => {
                  cy.setTenant(holdingsAffiliation);
                  InventoryHoldings.createHoldingRecordViaApi({
                    instanceId: instanceData.instanceId,
                    permanentLocationId: locations[holdingsAffiliation].id,
                    sourceId: holdingsSourceId,
                  });
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
            });
        });

        after('Delete user, data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);
          Users.deleteViaApi(user.userId);
          InventoryInstances.deleteFullInstancesByTitleViaApi(instancePrefix);
          InventoryInstance.deleteInstanceViaApi(testInstanceId);

          cy.setTenant(Affiliations.University);
          InventoryInstances.deleteFullInstancesByTitleViaApi(instancePrefix);

          cy.resetTenant();
          InventoryInstances.deleteFullInstancesByTitleViaApi(instancePrefix);
        });

        it(
          'C402368 Adding child or parent "Instance" in "Inventory" app: Use "Held by" facet in "Member" tenant (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'C402368'] },
          () => {
            InventorySearchAndFilter.clearDefaultFilter(heldbyAccordionName);
            InventoryInstances.searchByTitle(testInstanceId);
            InventoryInstances.selectInstanceById(testInstanceId);
            InstanceRecordView.waitLoading();
            InstanceRecordView.edit();
            InstanceRecordEdit.waitLoading();

            InstanceRecordEdit.openAddChildInstanceModal();
            InventorySearchAndFilter.verifyAccordionExistance(heldbyAccordionName);
            InventorySearchAndFilter.instanceTabIsDefault();

            InventorySearchAndFilter.switchToItem();
            InventorySearchAndFilter.itemTabIsDefault();
            InventorySearchAndFilter.verifyAccordionExistance(heldbyAccordionName);

            InventorySearchAndFilter.clearDefaultFilter(heldbyAccordionName);
            SelectInstanceModal.searchByName(instancePrefix);
            InventorySearchAndFilter.verifyNumberOfSearchResults(instanceIndexesAllVisible.length);
            instanceIndexesAllVisible.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySharedIconForResult(
                instanceTitles[instanceIndex],
                instanceIndexesShared.includes(instanceIndex),
              );
            });

            InventorySearchAndFilter.toggleAccordionByName(heldbyAccordionName);
            SelectInstanceModal.selectMultiSelectFilterOption(
              heldbyAccordionName,
              tenantNames.college,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              heldbyAccordionName,
              tenantNames.college,
              true,
            );
            InventorySearchAndFilter.verifyNumberOfSearchResults(
              instanceIndexesHelbyCollege.length,
            );
            instanceIndexesHelbyCollege.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySharedIconForResult(
                instanceTitles[instanceIndex],
                instanceIndexesShared.includes(instanceIndex),
              );
            });

            InstanceRecordEdit.closeSelectInstanceModal();
            InstanceRecordEdit.waitLoading();
            InstanceRecordEdit.openAddParentInstanceModal();

            InventorySearchAndFilter.verifyAccordionExistance(heldbyAccordionName);
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

            InventorySearchAndFilter.toggleAccordionByName(heldbyAccordionName);
            SelectInstanceModal.selectMultiSelectFilterOption(
              heldbyAccordionName,
              tenantNames.university,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              heldbyAccordionName,
              tenantNames.university,
              true,
            );
            InventorySearchAndFilter.verifyNumberOfSearchResults(
              instanceIndexesHelbyUniversity.length,
            );
            instanceIndexesHelbyUniversity.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySharedIconForResult(
                instanceTitles[instanceIndex],
                instanceIndexesShared.includes(instanceIndex),
              );
            });

            SelectInstanceModal.selectMultiSelectFilterOption(
              heldbyAccordionName,
              tenantNames.university,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              heldbyAccordionName,
              tenantNames.university,
              false,
            );
            SelectInstanceModal.selectMultiSelectFilterOption(
              heldbyAccordionName,
              tenantNames.college,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              heldbyAccordionName,
              tenantNames.college,
              true,
            );
            InventorySearchAndFilter.verifyNumberOfSearchResults(
              instanceIndexesHelbyCollege.length,
            );
            instanceIndexesHelbyCollege.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySharedIconForResult(
                instanceTitles[instanceIndex],
                instanceIndexesShared.includes(instanceIndex),
              );
            });

            SelectInstanceModal.selectMultiSelectFilterOption(
              heldbyAccordionName,
              tenantNames.university,
            );
            InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
              heldbyAccordionName,
              tenantNames.university,
              true,
            );
            InventorySearchAndFilter.verifyNumberOfSearchResults(instanceIndexesAllVisible.length);
            instanceIndexesAllVisible.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySharedIconForResult(
                instanceTitles[instanceIndex],
                instanceIndexesShared.includes(instanceIndex),
              );
            });

            InventorySearchAndFilter.toggleAccordionByName(sourceAccordionName);
            InventorySearchAndFilter.selectOptionInExpandedFilter(
              sourceAccordionName,
              INSTANCE_SOURCE_NAMES.FOLIO,
            );
            InventorySearchAndFilter.verifyNumberOfSearchResults(folioInstanceIndexes.length);
            folioInstanceIndexes.forEach((instanceIndex) => {
              InventorySearchAndFilter.verifySharedIconForResult(
                instanceTitles[instanceIndex],
                instanceIndexesShared.includes(instanceIndex),
              );
            });
          },
        );
      });
    });
  });
});
