import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseSubjects from '../../../support/fragments/inventory/search/browseSubjects';
import SubjectTypes from '../../../support/fragments/settings/inventory/instances/subjectTypes';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe(
    'Subject Browse',
    {
      retries: {
        runMode: 1,
      },
    },
    () => {
      const testData = {
        user: {},
        subjectType: {
          subjectHeading: `C584511 Government information${getRandomPostfix()}`,
          typeName: `C584511 Local subject type${getRandomPostfix()}`,
        },
      };

      beforeEach('Create test data and login', () => {
        cy.getAdminToken();
        InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
          testData.instance = instanceData;
        });
        SubjectTypes.createViaApi({
          source: 'local',
          name: testData.subjectType.typeName,
        }).then((responce) => {
          testData.subjectType.id = responce.body.id;

          cy.getInstanceById(testData.instance.instanceId).then((body) => {
            body.subjects = [
              {
                value: testData.subjectType.subjectHeading,
                typeId: responce.body.id,
              },
            ];
            cy.updateInstance(body);
          });
        });
        cy.getAdminToken();
        cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
          testData.user = userProperties;

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          InventorySearchAndFilter.verifySearchAndFilterPane();
          InventorySearchAndFilter.switchToBrowseTab();
        });
      });

      afterEach('Delete created instance', () => {
        cy.getAdminToken();
        InventoryInstance.deleteInstanceViaApi(testData.instance.instanceId);
        SubjectTypes.deleteViaApi(testData.subjectType.id);
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C584511 Check filtering by local Subject type in FOLIO records (folijet)',
        { tags: ['criticalPath', 'folijet', 'C584511'] },
        () => {
          BrowseSubjects.searchBrowseSubjects(testData.subjectType.subjectHeading);
          BrowseSubjects.searchBrowseSubjects(testData.subjectType.subjectHeading);
          BrowseSubjects.expandAccordion('Subject type');
          BrowseSubjects.selectSubjectType(testData.subjectType.typeName);
          cy.wait(1500);
          BrowseSubjects.verifySearchResult(testData.subjectType.typeName);
        },
      );
    },
  );
});
