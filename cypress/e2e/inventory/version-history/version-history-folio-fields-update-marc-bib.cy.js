import { matching } from '@interactors/html';
import { INSTANCE_STATUS_TERM_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import Users from '../../../support/fragments/users/users';
import VersionHistorySection from '../../../support/fragments/inventory/versionHistorySection';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import InteractorsTools from '../../../support/utils/interactorsTools';
import InstanceStates from '../../../support/fragments/inventory/instanceStates';

describe('Inventory', () => {
  describe('MARC Bibliographic', () => {
    describe('Version history', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        instanceTitle: `AT_C692122_MarcBibInstance_${randomPostfix}`,
        userProperties: null,
        updatedStatusTerm: INSTANCE_STATUS_TERM_NAMES.CATALOGED,
      };

      const permissions = [
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      ];

      const marcBibFields = [
        {
          tag: '008',
          content: QuickMarcEditor.valid008ValuesInstance,
        },
        {
          tag: '245',
          content: `$a ${testData.instanceTitle}`,
          indicators: ['0', '0'],
        },
      ];

      before('Create test data', () => {
        cy.getAdminToken();

        cy.createTempUser(permissions).then((userProperties) => {
          testData.userProperties = userProperties;

          cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
            (instanceId) => {
              testData.createdRecordId = instanceId;

              cy.login(testData.userProperties.username, testData.userProperties.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
              InventoryInstances.searchByTitle(testData.createdRecordId);
              InventoryInstances.selectInstanceById(testData.createdRecordId);
              InventoryInstance.waitLoading();
            },
          );
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        InventoryInstance.deleteInstanceViaApi(testData.createdRecordId);
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C692122 Check "Version history" pane of "MARC bibliographic" record after Update of FOLIO instance fields (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C692122'] },
        () => {
          // Step 1: Click on the "Actions" on the third pane >> "Edit instance"
          InstanceRecordView.edit();
          InstanceRecordEdit.waitLoading();

          // Step 2: Update any editable (FOLIO) field and click "Save & close"
          InstanceRecordEdit.chooseInstanceStatusTerm(testData.updatedStatusTerm);
          InstanceRecordEdit.saveAndClose();
          InteractorsTools.checkCalloutMessage(
            matching(new RegExp(InstanceStates.instanceSavedSuccessfully)),
          );

          // Step 3: Click on "Actions" >> "View source" >> Click on the 'Version history' icon
          InventoryInstance.viewSource();
          InventoryViewSource.waitLoading();
          InventoryViewSource.verifyVersionHistoryButtonShown();
          InventoryViewSource.clickVersionHistoryButton();
          VersionHistorySection.waitLoading();

          VersionHistorySection.verifyVersionHistoryPane(1);
          VersionHistorySection.clickCloseButton();
        },
      );
    });
  });
});
