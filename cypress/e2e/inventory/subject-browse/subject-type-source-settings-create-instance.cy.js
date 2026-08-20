import { Permissions } from '../../../support/dictionary';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryNewInstance from '../../../support/fragments/inventory/inventoryNewInstance';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../support/utils/stringTools';
import { FOLIO_SUBJECT_TYPES } from '../../../support/fragments/settings/inventory/instances/subjectTypes';

describe('Inventory', () => {
  describe('Subject Browse', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      instanceTitle: `AT_C552481_FolioInstance_${randomPostfix}`,
      user: {},
    };
    const subjectSources = [
      'Library of Congress Subject Headings',
      "Library of Congress Children's and Young Adults' Subject Headings",
      'Medical Subject Headings',
      'National Agricultural Library subject authority file',
      'Source not specified',
      'Canadian Subject Headings',
      'Répertoire de vedettes-matière',
    ];
    const subjectTypes = FOLIO_SUBJECT_TYPES;
    const testSubjects = [
      { source: subjectSources[0], type: subjectTypes[0] },
      { source: subjectSources[1], type: subjectTypes[1] },
      { source: subjectSources[2], type: subjectTypes[2] },
      { source: subjectSources[3], type: subjectTypes[3] },
      { source: subjectSources[4], type: subjectTypes[4] },
      { source: subjectSources[5], type: subjectTypes[5] },
      { source: subjectSources[6], type: subjectTypes[6] },
      { source: subjectSources[0], type: subjectTypes[7] },
      { source: subjectSources[2], type: subjectTypes[8] },
      { source: subjectSources[4], type: subjectTypes[9] },
    ];

    before('Create user and login', () => {
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
        InventoryInstances.deleteInstanceByTitleViaApi('AT_C552481_');
      });
    });

    it(
      'C552481 Check the subject type and source settings on Create Instance page (promin)',
      { tags: ['extendedPath', 'promin', 'C552481'] },
      () => {
        // Step 1: Click Actions > + New; verify New instance page opened
        InventoryInstances.addNewInventory();

        // Step 2: Fill Resource title and Resource type
        InventoryNewInstance.waitLoading();
        InventoryNewInstance.fillRequiredValues(testData.instanceTitle);

        // Step 3: Click Add subject; verify row with Subject, Subject source, Subject type fields
        InstanceRecordEdit.clickAddSubjectButton();
        InstanceRecordEdit.verifySubjectRowIsDisplayed();

        // Step 4: Verify subject sources dropdown contains all expected options
        InstanceRecordEdit.verifySubjectSourceOptions(subjectSources);

        // Step 5: Select a value from Subject source
        InstanceRecordEdit.selectSubjectSource(subjectSources[0]);

        // Step 6: Verify subject types dropdown contains all expected options
        InstanceRecordEdit.verifySubjectTypeOptions(subjectTypes);

        // Step 7: Select a value from Subject type
        InstanceRecordEdit.selectSubjectType(subjectTypes[0]);

        // Step 8: Delete the row; verify row removed
        InstanceRecordEdit.deleteSubject();
        InstanceRecordEdit.verifySubjectRowIsRemoved();

        // Step 9: Add 10 subjects with different source/type combinations
        testSubjects.forEach(({ source, type }, index) => {
          InstanceRecordEdit.clickAddSubjectButton();
          InstanceRecordEdit.changeSubjectAtIndex(
            index,
            `AT_C552481_Subject_${index}_${randomPostfix}`,
          );
          InstanceRecordEdit.selectSubjectSource(source, index);
          InstanceRecordEdit.selectSubjectType(type, index);
        });

        // Step 10: Save & close; verify instance details, subject accordion, no errors
        InventoryNewInstance.clickSaveCloseButton();
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();
        testSubjects.forEach(({ source, type }, index) => {
          InstanceRecordView.verifyInstanceSubject({
            indexRow: index,
            subjectHeadings: `AT_C552481_Subject_${index}_${randomPostfix}`,
            subjectSource: source,
            subjectType: type,
          });
        });
        InteractorsTools.checkNoErrorCallouts();
      },
    );
  });
});
