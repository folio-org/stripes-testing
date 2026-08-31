import { Permissions } from '../../../support/dictionary';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryNewInstance from '../../../support/fragments/inventory/inventoryNewInstance';
import { FOLIO_SUBJECT_TYPES } from '../../../support/fragments/settings/inventory/instances/subjectTypes';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Subject Browse', () => {
    const testData = {
      instance: {},
      user: {},
      subjectHeadings: `AT_C552483_Subject_${getRandomPostfix()}`,
    };
    const subjectSources = [
      'Library of Congress Subject Headings',
      "Library of Congress Children's and Young Adults' Subject Headings",
    ];
    const subjectTypes = FOLIO_SUBJECT_TYPES;

    before('Create test data and login', () => {
      cy.getAdminToken();
      InventoryInstance.createInstanceViaApi({
        instanceTitle: `AT_C552483_FolioInstance_${getRandomPostfix()}`,
      }).then(({ instanceData }) => {
        testData.instance = instanceData;
      });
      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.user = userProperties;
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(testData.user.userId);
        InventoryInstances.deleteInstanceByTitleViaApi('C552483_');
      });
    });

    it(
      'C552483 Check the subject type and source settings on Duplicate FOLIO Instance page (promin)',
      { tags: ['extendedPath', 'promin', 'C552483'] },
      () => {
        // Step 1: Search for instance, open detail view
        InventoryInstances.searchByTitle(testData.instance.instanceId);
        InventoryInstances.selectInstanceById(testData.instance.instanceId);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();

        // Step 2: Click Actions > Duplicate instance; verify New instance page opened
        InstanceRecordView.duplicate();
        InventoryNewInstance.waitLoading();

        // Step 3: Click Add subject; verify row with Subject, Subject source, Subject type fields
        InstanceRecordEdit.clickAddSubjectButton();
        InstanceRecordEdit.verifySubjectRowIsDisplayed();

        // Step 4: Verify subject sources dropdown contains expected options
        InstanceRecordEdit.verifySubjectSourceOptions(subjectSources);

        // Step 5: Select a value from Subject source
        InstanceRecordEdit.selectSubjectSource(subjectSources[0]);

        // Step 6: Verify subject types dropdown contains expected options
        InstanceRecordEdit.verifySubjectTypeOptions(subjectTypes);

        // Step 7: Select a value from Subject type
        InstanceRecordEdit.selectSubjectType(subjectTypes[0]);

        // Step 8: Delete the row; verify row removed
        InstanceRecordEdit.deleteSubject();
        InstanceRecordEdit.verifySubjectRowIsRemoved();

        // Step 9: Repeat steps 3-7 with different values
        InstanceRecordEdit.clickAddSubjectButton();
        InstanceRecordEdit.verifySubjectRowIsDisplayed();
        InstanceRecordEdit.changeSubject(testData.subjectHeadings);
        InstanceRecordEdit.selectSubjectSource(subjectSources[1]);
        InstanceRecordEdit.selectSubjectType(subjectTypes[1]);

        // Step 10: Save & close; verify instance details and subject accordion
        InventoryNewInstance.clickSaveCloseButton();
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();
        InstanceRecordView.verifyInstanceSubject({
          indexRow: 0,
          subjectHeadings: testData.subjectHeadings,
          subjectSource: subjectSources[1],
          subjectType: subjectTypes[1],
        });
        InteractorsTools.checkNoErrorCallouts();
      },
    );
  });
});
