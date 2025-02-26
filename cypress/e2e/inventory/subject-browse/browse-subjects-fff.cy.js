import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseSubjects from '../../../support/fragments/inventory/search/browseSubjects';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';

describe('Inventory', () => {
  describe('Subject Browse', () => {
    const testData = {
      subjectValues: [
        'Viernes, Gene,---1981.',
        'Ophidiiformes.',
        'Lennon, Barbara Egger.',
        'Soils--Arkansas--Little River County--Maps.',
        'Africa--History--To 1884--Periodization.',
        'Spain--History--Revolution, 1931.',
        'Vocational guidance--Canada',
        'Aliens--Taxation--United States',
        'Ardoyne (Belfast, Northern Ireland)--History--20th century--Fiction.',
        'Cossacks--Eurasia.',
        'Fan, Zhongyan,--989-1052',
      ],
      instanceTitlePrefix: `C627240 Autotest subject browse ${getRandomPostfix()}`,
    };

    const createdInstanceIDs = [];

    before('Creating user and instances', () => {
      cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((userProperties) => {
        testData.user = userProperties;

        InventoryInstances.getInstancesViaApi({
          limit: 100,
          query: 'title="C627240 Autotest"',
        }).then((instances) => {
          if (instances) {
            instances.forEach(({ id }) => {
              InventoryInstance.deleteInstanceViaApi(id);
            });
          }
        });

        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          const instanceTypeId = instanceTypes[0].id;

          testData.subjectValues.forEach((subject, index) => {
            InventoryInstances.createFolioInstanceViaApi({
              instance: { title: `${testData.instanceTitlePrefix} ${index}`, instanceTypeId },
            }).then((instanceData) => {
              const instanceId = instanceData.instanceId;
              cy.getInstanceById(instanceId).then((body) => {
                const requestBody = body;
                requestBody.subjects = [{ value: subject }];
                cy.updateInstance(requestBody);
              });
              createdInstanceIDs.push(instanceId);
            });
          });
        });
      });
    });

    after('Deleting user and instance', () => {
      cy.getAdminToken();
      createdInstanceIDs.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C627240 Browse for subject which "Id" starts with "fff" (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C627240'] },
      () => {
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventorySearchAndFilter.waitLoading,
        });
        InventorySearchAndFilter.switchToBrowseTab();
        testData.subjectValues.forEach((subject) => {
          BrowseSubjects.waitForSubjectToAppear(subject);
          BrowseSubjects.searchBrowseSubjects(subject);
          BrowseSubjects.checkSearchResultsTable();
          BrowseSubjects.checkRowValueIsBold(5, subject);
          InventorySearchAndFilter.clickResetAllButton();
          InventorySearchAndFilter.verifyBrowseResultPaneEmpty();
        });
      },
    );
  });
});
