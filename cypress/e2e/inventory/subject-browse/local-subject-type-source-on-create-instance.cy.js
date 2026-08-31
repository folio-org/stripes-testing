import { Permissions } from '../../../support/dictionary';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryNewInstance from '../../../support/fragments/inventory/inventoryNewInstance';
import SubjectSources from '../../../support/fragments/settings/inventory/instances/subjectSources';
import SubjectTypes from '../../../support/fragments/settings/inventory/instances/subjectTypes';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Subject Browse', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      instanceTitle: `AT_C584481_FolioInstance_${randomPostfix}`,
      subjectHeadings: `AT_C584481_Subject_${randomPostfix}`,
      subjectSource: {},
      subjectType: {},
      user: {},
    };

    before('Create test data and login', () => {
      cy.getAdminToken();
      SubjectSources.createViaApi({
        source: 'local',
        name: `AT_C584481_Source_${randomPostfix}`,
        code: `AT_${randomPostfix}`,
      }).then((response) => {
        testData.subjectSource.id = response.body.id;
        testData.subjectSource.name = `AT_C584481_Source_${randomPostfix}`;
      });
      SubjectTypes.createViaApi({
        source: 'local',
        name: `AT_C584481_Type_${randomPostfix}`,
      }).then((response) => {
        testData.subjectType.id = response.body.id;
        testData.subjectType.name = `AT_C584481_Type_${randomPostfix}`;
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
        InventoryInstances.deleteInstanceByTitleViaApi('C584481_');
        Users.deleteViaApi(testData.user?.userId);
        SubjectSources.deleteViaApi(testData.subjectSource?.id);
        SubjectTypes.deleteViaApi(testData.subjectType?.id);
      });
    });

    it(
      'C584481 Check the local subject type and source settings on Create Instance page (promin)',
      { tags: ['extendedPath', 'promin', 'C584481'] },
      () => {
        // Step 1: Click Actions > + New; verify New instance page opened
        InventoryInstances.addNewInventory();

        // Step 2: Fill Resource title and Resource type
        InventoryNewInstance.waitLoading();
        InventoryNewInstance.fillRequiredValues(testData.instanceTitle);

        // Step 3: Click Add subject; verify row with Subject, Subject source, Subject type fields
        InstanceRecordEdit.clickAddSubjectButton();
        InstanceRecordEdit.verifySubjectRowIsDisplayed();
        InstanceRecordEdit.changeSubject(testData.subjectHeadings);

        // Step 4: Select local subject source
        InstanceRecordEdit.selectSubjectSource(testData.subjectSource.name);

        // Step 5: Select local subject type
        InstanceRecordEdit.selectSubjectType(testData.subjectType.name);

        // Step 6: Save & close; verify instance details with subject source and type; no errors
        InventoryNewInstance.clickSaveAndCloseButton();
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();
        InstanceRecordView.verifyInstanceSubject({
          indexRow: 0,
          subjectHeadings: testData.subjectHeadings,
          subjectSource: testData.subjectSource.name,
          subjectType: testData.subjectType.name,
        });
        InteractorsTools.checkNoErrorCallouts();
      },
    );
  });
});
