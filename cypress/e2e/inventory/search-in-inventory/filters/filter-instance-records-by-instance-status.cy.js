import { Permissions } from '../../../../support/dictionary';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import getRandomPostfix, { getRandomLetters } from '../../../../support/utils/stringTools';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InstanceStatusTypes from '../../../../support/fragments/settings/inventory/instances/instanceStatusTypes/instanceStatusTypes';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../../support/constants';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Filters', () => {
      const randomPostfix = getRandomPostfix();
      const randomLetters = getRandomLetters(7);
      const testData = {
        instancesTitlePrefix: `AT_C415361_Instance_${randomPostfix}`,
        instanceStatusAccordionName: 'Instance status',
        instanceStatusPrefix: `AT_C415361_${randomLetters}`,
        codePrefix: `ut_${randomLetters}`,
        instanceStatusSource: 'local',
        tag008: '008',
        tag245: '245',
      };
      const createdRecordIds = [];
      const instanceStatuses = [];
      let instanceTypeId;
      let user;

      before('Create user, test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteInstanceByTitleViaApi('AT_C415361');
        InstanceStatusTypes.getViaApi({ limit: 200 }).then((types) => {
          types.forEach((type) => {
            if (type.name.includes('C415361')) {
              InstanceStatusTypes.deleteViaApi(type.id);
            }
          });
        });
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiSettingsInstanceStatusesCreateEditDelete.gui,
        ]).then((createdUserProperties) => {
          user = createdUserProperties;

          cy.then(() => {
            cy.getInstanceTypes({ limit: 200 }).then((types) => {
              instanceTypeId = types.filter((item) => item.source === 'rdacontent')[0].id;
            });
            for (let i = 0; i < 8; i++) {
              InstanceStatusTypes.createViaApi({
                name: `${testData.instanceStatusPrefix}_${i}`,
                code: `${testData.codePrefix}_${i}`,
                source: testData.instanceStatusSource,
              }).then((response) => {
                instanceStatuses.push(response.body);
              });
            }
          })
            .then(() => {
              for (let i = 0; i < 4; i++) {
                InventoryInstances.createFolioInstanceViaApi({
                  instance: {
                    instanceTypeId,
                    title: `${testData.instancesTitlePrefix}_${i}`,
                    statusId: instanceStatuses[i].id,
                  },
                }).then((instance) => {
                  createdRecordIds.push(instance.instanceId);
                });
              }
              for (let i = 4; i < 8; i++) {
                cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, [
                  {
                    tag: testData.tag008,
                    content: QuickMarcEditor.valid008ValuesInstance,
                  },
                  {
                    tag: testData.tag245,
                    content: `$a ${testData.instancesTitlePrefix}_${i}`,
                    indicators: ['1', '\\'],
                  },
                ]).then((instanceId) => {
                  createdRecordIds.push(instanceId);
                  cy.getInstanceById(instanceId).then((instance) => {
                    instance.statusId = instanceStatuses[i].id;
                    cy.updateInstance(instance);
                  });
                });
              }
            })
            .then(() => {
              cy.login(user.username, user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
              InventorySearchAndFilter.instanceTabIsDefault();
            });
        });
      });

      after('Delete user, test data', () => {
        cy.getAdminToken();
        createdRecordIds.forEach((id) => {
          InventoryInstance.deleteInstanceViaApi(id);
        });
        instanceStatuses.forEach((type) => {
          InstanceStatusTypes.deleteViaApi(type.id);
        });
        Users.deleteViaApi(user.userId);
      });

      it(
        'C415361 Filter "Instance" records by instance status (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C415361'] },
        () => {
          InventorySearchAndFilter.toggleAccordionByName(testData.instanceStatusAccordionName);
          InventorySearchAndFilter.checkOptionsWithCountersExistInAccordion(
            testData.instanceStatusAccordionName,
          );
          InventorySearchAndFilter.selectMultiSelectFilterOption(
            testData.instanceStatusAccordionName,
            instanceStatuses[0].name,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            testData.instanceStatusAccordionName,
            instanceStatuses[0].name,
          );
          InventorySearchAndFilter.verifyNumberOfSearchResults(1);
          InventorySearchAndFilter.verifySearchResult(`${testData.instancesTitlePrefix}_0`);
          InventorySearchAndFilter.clearFilter(testData.instanceStatusAccordionName);

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.INVENTORY);
          InstanceStatusTypes.choose();

          InstanceStatusTypes.clickTrashButtonForInstanceStatusTypes(instanceStatuses[1].name);
          InstanceStatusTypes.verifyInstanceStatusTypesAbsentInTheList({
            name: instanceStatuses[1].name,
          });

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventoryInstances.waitContentLoading();

          InventorySearchAndFilter.executeSearch(testData.instancesTitlePrefix);
          InventorySearchAndFilter.verifyResultListExists();

          InventorySearchAndFilter.toggleAccordionByName(testData.instanceStatusAccordionName);
          InventorySearchAndFilter.checkOptionsWithCountersExistInAccordion(
            testData.instanceStatusAccordionName,
          );

          InventorySearchAndFilter.selectMultiSelectFilterOption(
            testData.instanceStatusAccordionName,
            instanceStatuses[2].name,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            testData.instanceStatusAccordionName,
            instanceStatuses[2].name,
          );
          InventorySearchAndFilter.verifySearchResult(`${testData.instancesTitlePrefix}_2`);
          InventorySearchAndFilter.verifyNumberOfSearchResults(1);
        },
      );
    });
  });
});
