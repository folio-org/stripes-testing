import { APPLICATION_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseSubjects from '../../../support/fragments/inventory/search/browseSubjects';
import SubjectSources from '../../../support/fragments/settings/inventory/instances/subjectSources';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
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
        subjectSource: {
          subjectHeading: `C584507 subjectHeading${getRandomPostfix()}`,
          name: `C584507 subjectSource${getRandomPostfix()}`,
          code: `C584507 SS${getRandomPostfix()}`,
        },
        columnName: 'Subject source',
      };

      beforeEach('Create test data and login', () => {
        cy.getAdminToken();
        InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
          testData.instance = instanceData;
        });
        SubjectSources.createViaApi({
          source: 'local',
          name: testData.subjectSource.name,
          code: testData.subjectSource.code,
        }).then((responce) => {
          testData.subjectSource.id = responce.body.id;

          cy.getInstanceById(testData.instance.instanceId).then((body) => {
            body.subjects = [
              {
                authorityId: null,
                value: testData.subjectSource.subjectHeading,
                sourceId: responce.body.id,
                typeId: null,
              },
            ];
            cy.updateInstance(body);
          });
        });

        cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
          testData.user = userProperties;

          cy.login(testData.user.username, testData.user.password);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventoryInstances.waitContentLoading();
          cy.wait(5000);
        });
      });

      afterEach('Delete created instance', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        InventoryInstance.deleteInstanceViaApi(testData.instance.instanceId);
        SubjectSources.deleteViaApi(testData.subjectSource.id);
      });

      it(
        'C584507 Check filtering by local Subject Source (folijet)',
        { tags: ['criticalPath', 'folijet', 'C584507'] },
        () => {
          InventorySearchAndFilter.verifySearchAndFilterPane();
          InventorySearchAndFilter.switchToBrowseTab();
          BrowseSubjects.searchBrowseSubjects(testData.subjectSource.subjectHeading);
          cy.wait(2000);
          BrowseSubjects.checkSearchResultRecord(testData.subjectSource.subjectHeading);
          cy.wait(2000);
          BrowseSubjects.expandAccordion(testData.columnName);
          BrowseSubjects.selectSubjectSource(testData.subjectSource.name);
          BrowseSubjects.verifySearchResult(testData.subjectSource.name, testData.columnName);
        },
      );
    },
  );
});
