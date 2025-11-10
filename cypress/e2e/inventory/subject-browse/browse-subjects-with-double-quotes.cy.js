import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseSubjects from '../../../support/fragments/inventory/search/browseSubjects';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Subjects Browse', () => {
    const user = {};
    const marcFile = {
      marc: 'marcBibFileForC360948.mrc',
      fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      propertyName: 'instance',
      numOfRecords: 1,
    };
    let createdInstanceID;
    const exactSearchName = 'C360948 Waffen-SS. Panzer Division "Totenkopf". 3--History';
    const expectedSubject = {
      indexRow: 0,
      subjectHeadings: 'C360948 Waffen-SS. Panzer Division "Totenkopf". 3--History',
      subjectSource: 'Library of Congress Subject Headings',
      subjectType: 'Corporate name',
    };

    before('Creating user and test data', () => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.inventoryAll.gui]).then((createdUserProperties) => {
        user.userProperties = createdUserProperties;
        DataImport.uploadFileViaApi(
          marcFile.marc,
          marcFile.fileName,
          marcFile.jobProfileToRun,
        ).then((response) => {
          response.forEach((record) => {
            createdInstanceID = record[marcFile.propertyName].id;
          });
        });

        cy.login(user.userProperties.username, user.userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        InventorySearchAndFilter.selectBrowseSubjects();
      });
    });

    after('Deleting created user and test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userProperties.userId);
      InventoryInstance.deleteInstanceViaApi(createdInstanceID);
    });

    it(
      'C360948 Browse subject which has double quotes (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C360948'] },
      () => {
        BrowseSubjects.waitForSubjectToAppear(expectedSubject.subjectHeadings);

        // 1. Browse for a subject with double quotes
        BrowseSubjects.searchBrowseSubjects(exactSearchName);

        // 2. Click on the row with highlighted in bold Subject with double quotes
        BrowseSubjects.checkValueIsBold(exactSearchName);

        // 3. Click on the row with the "Instance" related to the subject
        BrowseSubjects.verifyClickTakesToInventory(exactSearchName);

        // 4. Scroll down to the "Subjects" accordion button and verify the subject with double quotes
        InstanceRecordView.verifyInstanceSubject(expectedSubject);
      },
    );
  });
});
