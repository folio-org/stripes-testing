import { Permissions } from '../../../../support/dictionary';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import { INSTANCE_SOURCE_NAMES } from '../../../../support/constants';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Filters', () => {
      const randomPostfix = getRandomPostfix();
      const instancesTitlePrefix = `AT_C594392_Instance_${randomPostfix}`;
      const instancesData = [
        { source: INSTANCE_SOURCE_NAMES.FOLIO },
        { source: INSTANCE_SOURCE_NAMES.MARC },
      ];
      const instanceTitles = Array.from(
        { length: instancesData.length },
        (_, i) => `${instancesTitlePrefix}_${i}`,
      );
      const dateAccordionNames = ['Date range', 'Date created', 'Date updated'];
      const invalidDateValues = [
        {
          accordion: dateAccordionNames[0],
          from: '123',
          to: '34222',
          errorText: 'Please enter a valid year',
        },
        {
          accordion: dateAccordionNames[1],
          from: '2019',
          to: '20',
          errorText: 'Please enter a valid date',
        },
        {
          accordion: dateAccordionNames[2],
          from: '2021',
          to: '20',
          errorText: 'Please enter a valid date',
        },
      ];
      const createdRecordIds = [];
      let user;

      before('Create user, test data', () => {
        cy.getAdminToken();
        cy.createTempUser([Permissions.uiInventoryViewInstances.gui])
          .then((createdUserProperties) => {
            user = createdUserProperties;
            cy.getInstanceTypes({ limit: 1 }).then((types) => {
              const instanceTypeId = types[0].id;

              instancesData.forEach((data, index) => {
                if (data.source === INSTANCE_SOURCE_NAMES.FOLIO) {
                  InventoryInstances.createFolioInstanceViaApi({
                    instance: {
                      instanceTypeId,
                      title: instanceTitles[index],
                    },
                  }).then((createdInstanceData) => {
                    createdRecordIds.push(createdInstanceData.instanceId);
                  });
                } else {
                  cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, [
                    {
                      tag: '008',
                      content: QuickMarcEditor.defaultValid008Values,
                    },
                    {
                      tag: '245',
                      content: `$a ${instanceTitles[index]}`,
                      indicators: ['1', '1'],
                    },
                  ]).then((instanceId) => {
                    createdRecordIds.push(instanceId);
                  });
                }
              });
            });
          })
          .then(() => {
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            InventorySearchAndFilter.instanceTabIsDefault();
          });
      });

      after('Delete user, test data', () => {
        cy.getAdminToken();
        createdRecordIds.forEach((id) => {
          InventoryInstance.deleteInstanceViaApi(id);
        });
        Users.deleteViaApi(user.userId);
      });

      it(
        'C594392 "Reset all" button clears Date filters filled with invalid values (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C594392'] },
        () => {
          InventorySearchAndFilter.executeSearch(instancesTitlePrefix);
          InventorySearchAndFilter.verifyNumberOfSearchResults(instanceTitles.length);

          dateAccordionNames.forEach((accordionName) => {
            InventorySearchAndFilter.toggleAccordionByName(accordionName);
          });

          invalidDateValues.forEach((dateSet) => {
            InventorySearchAndFilter.fillDateFilterValues(
              dateSet.accordion,
              dateSet.from,
              dateSet.to,
            );
          });

          InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
          InventorySearchAndFilter.checkSearchQueryText('');
          dateAccordionNames.forEach((accordionName) => {
            InventorySearchAndFilter.verifyDateFilterValues(accordionName, '', '');
          });

          InventorySearchAndFilter.executeSearch(instancesTitlePrefix);
          InventorySearchAndFilter.verifyNumberOfSearchResults(instanceTitles.length);

          invalidDateValues.forEach((dateSet) => {
            InventorySearchAndFilter.fillDateFilterValues(
              dateSet.accordion,
              dateSet.from,
              dateSet.to,
            );
            InventorySearchAndFilter.checkErrorsForDateFilterFields(
              dateSet.accordion,
              dateSet.errorText,
              dateSet.errorText,
            );
          });

          InventorySearchAndFilter.bySource(INSTANCE_SOURCE_NAMES.FOLIO);
          InventorySearchAndFilter.verifyNumberOfSearchResults(1);
          InventorySearchAndFilter.verifySearchResult(instanceTitles[0]);
          invalidDateValues.forEach((dateSet) => {
            InventorySearchAndFilter.checkErrorsForDateFilterFields(
              dateSet.accordion,
              dateSet.errorText,
              dateSet.errorText,
            );
          });
        },
      );
    });
  });
});
