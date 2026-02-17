import { APPLICATION_NAMES, DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseSubjects from '../../../support/fragments/inventory/search/browseSubjects';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Subject Browse', () => {
    const testData = {
      user: {},
      subject: {
        indexRow: 1,
        name: 'Short stories',
        source: 'Library of Congress Subject Headings',
        type: 'Topical term',
      },
    };
    const marcFile = {
      filePath: 'marcBibFileForC584546.mrc',
      fileName: `C584546 autotestFile${getRandomPostfix()}.mrc`,
      jobProfile: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
    };

    before('Create test data and login', () => {
      cy.getAdminToken();
      InventorySearchAndFilter.getInstancesBySubjectViaApi(testData.subject.name).then(
        (instances) => {
          if (instances.length > 0) {
            instances.forEach((instance) => {
              InventoryInstance.deleteInstanceViaApi(instance.id);
            });
          }
        },
      );
      cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
        const preconditionUserId = userProperties.userId;

        DataImport.uploadFileViaApi(marcFile.filePath, marcFile.fileName, marcFile.jobProfile).then(
          (response) => {
            testData.instanceId = response[0].instance.id;
          },
        );
        cy.getAdminToken();
        Users.deleteViaApi(preconditionUserId);
      });

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventoryInstances.waitContentLoading();
        cy.wait(8000);
      });
    });

    after('Delete created instance', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      InventoryInstance.deleteInstanceViaApi(testData.instanceId);
    });

    it(
      'C584546 Browsing the multiple instances with different subject sources (folijet)',
      { tags: ['criticalPath', 'folijet', 'C584546'] },
      () => {
        InventorySearchAndFilter.verifySearchAndFilterPane();
        InventorySearchAndFilter.switchToBrowseTab();
        cy.wait(5000);
        BrowseSubjects.searchBrowseSubjects(testData.subject.name);
        cy.wait(3000);
        BrowseSubjects.verifyDuplicateSubjectsWithDifferentSources(testData.subject);
        cy.wait(2000);
        BrowseSubjects.openInstance(testData.subject);
        InventoryInstances.selectInstance();
        InstanceRecordView.verifyInstanceSubject({
          indexRow: testData.subject.indexRow,
          subjectHeadings: testData.subject.name,
          subjectSource: testData.subject.source,
          subjectType: testData.subject.type,
        });
      },
    );
  });
});
