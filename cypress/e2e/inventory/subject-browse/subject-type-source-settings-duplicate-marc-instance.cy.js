import { Permissions } from '../../../support/dictionary';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryNewInstance from '../../../support/fragments/inventory/inventoryNewInstance';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import { FOLIO_SUBJECT_TYPES } from '../../../support/fragments/settings/inventory/instances/subjectTypes';
import { INSTANCE_SOURCE_NAMES } from '../../../support/constants';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Subject Browse', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      instanceTitle: `AT_C552484_MarcInstance_${randomPostfix}`,
      instanceId: null,
      user: {},
      subjectHeadings: `AT_C552484_Subject_${randomPostfix}`,
    };
    const marcInstanceFields = [
      { tag: '008', content: QuickMarcEditor.defaultValid008Values },
      { tag: '245', content: `$a ${testData.instanceTitle}`, indicators: ['1', '1'] },
    ];
    const subjectSources = [
      'Library of Congress Subject Headings',
      "Library of Congress Children's and Young Adults' Subject Headings",
    ];
    const subjectTypes = FOLIO_SUBJECT_TYPES;

    before('Create test data and login', () => {
      cy.getAdminToken();
      cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcInstanceFields).then(
        (instanceId) => {
          testData.instanceId = instanceId;
        },
      );
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
        InventoryInstances.deleteInstanceByTitleViaApi('C552484_');
      });
    });

    it(
      'C552484 Check the subject type and source settings on Duplicate MARC Instance page (promin)',
      { tags: ['extendedPath', 'promin', 'C552484'] },
      () => {
        // Step 1: Search for MARC instance, open detail view
        InventoryInstances.searchByTitle(testData.instanceId);
        InventoryInstances.selectInstanceById(testData.instanceId);
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

        // Step 10: Save & close; verify subject accordion, source changed to FOLIO, no errors
        InventoryNewInstance.clickSaveCloseButton();
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();
        InstanceRecordView.verifyInstanceSubject({
          indexRow: 0,
          subjectHeadings: testData.subjectHeadings,
          subjectSource: subjectSources[1],
          subjectType: subjectTypes[1],
        });
        InstanceRecordView.verifyInstanceSource(INSTANCE_SOURCE_NAMES.FOLIO);
        InteractorsTools.checkNoErrorCallouts();
      },
    );
  });
});
