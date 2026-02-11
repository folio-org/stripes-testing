import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import { Permissions } from '../../../../support/dictionary';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      const testData = {
        searchQuery: 'C407736 Fields order test, edit bibliographic',
        createdInstanceIds: [],
        marcFile: {
          marc: 'C407736MarcBib.mrc',
          fileName: `C407736_testMarcFile_${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          propertyName: 'instance',
        },
        expectedOrderAfterMove: [
          'LDR',
          '001',
          '005',
          '800',
          '700',
          '650',
          '600',
          '245',
          '240',
          '110',
          '009',
          '008',
          '007',
          '006',
          '004',
          '002',
          '999',
        ],
      };

      before('Create test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteInstanceByTitleViaApi('C407736*');

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
          Permissions.moduleDataImportEnabled.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          DataImport.uploadFileViaApi(
            testData.marcFile.marc,
            testData.marcFile.fileName,
            testData.marcFile.jobProfileToRun,
          ).then((response) => {
            response.forEach((record) => {
              testData.createdInstanceIds.push(record[testData.marcFile.propertyName].id);
            });
          });

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        testData.createdInstanceIds.forEach((id) => {
          InventoryInstance.deleteInstanceViaApi(id);
        });
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C407736 Verify that all fields (except "LDR", "005", "999") can be moved and saved when deriving "MARC bibliographic" record (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C407736'] },
        () => {
          // Step 1: Navigate to imported record and click "Derive new MARC bibliographic record"
          InventoryInstances.searchByTitle(testData.searchQuery);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
          InventoryInstance.deriveNewMarcBibRecord();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.checkPaneheaderContains('Derive a new MARC bib record');

          QuickMarcEditor.verifyTagValue(0, 'LDR');
          QuickMarcEditor.verifyTagValue(1, '001');
          QuickMarcEditor.verifyTagValue(2, '005');
          QuickMarcEditor.verifyTagValue(3, '002');
          QuickMarcEditor.verifyTagValue(4, '004');
          QuickMarcEditor.verifyTagValue(5, '006');
          QuickMarcEditor.verifyTagValue(6, '007');
          QuickMarcEditor.verifyTagValue(7, '008');
          QuickMarcEditor.verifyTagValue(8, '009');
          QuickMarcEditor.verifyTagValue(9, '010');
          QuickMarcEditor.verifyTagValue(10, '035');
          QuickMarcEditor.verifyTagValue(11, '035');
          QuickMarcEditor.verifyTagValue(12, '035');
          QuickMarcEditor.verifyTagValue(13, '110');
          QuickMarcEditor.verifyTagValue(14, '240');
          QuickMarcEditor.verifyTagValue(15, '245');
          QuickMarcEditor.verifyTagValue(16, '600');
          QuickMarcEditor.verifyTagValue(17, '650');
          QuickMarcEditor.verifyTagValue(18, '700');
          QuickMarcEditor.verifyTagValue(19, '800');
          QuickMarcEditor.verifyTagValue(20, '999');

          QuickMarcEditor.verifyEditableFieldIcons(0, false, false, false, false);
          QuickMarcEditor.verifyEditableFieldIcons(1, false, false, false, false);
          QuickMarcEditor.verifyEditableFieldIcons(2, false, false, false, false);
          QuickMarcEditor.verifyEditableFieldIcons(20, false, false, false, false);
          QuickMarcEditor.verifyEditableFieldIcons(3, false, true, true, true);
          QuickMarcEditor.verifyEditableFieldIcons(19, true, false, true, true);
          QuickMarcEditor.verifyEditableFieldIcons(7, true, true, false, true);
          QuickMarcEditor.verifyEditableFieldIcons(10, true, true, true, true);
          QuickMarcEditor.verifyEditableFieldIcons(15, true, true, false, true);

          // Update LDR to enable Save button
          QuickMarcEditor.updateLDR06And07Positions();

          // Step 2: Rearrange fields
          const sourceRow = 19;
          const firstTargetRow = 3;
          const fieldsToRearrange = 16;

          for (let i = 0; i < fieldsToRearrange; i++) {
            const targetPosition = firstTargetRow + i;
            for (let j = sourceRow; j > targetPosition; j--) {
              QuickMarcEditor.moveFieldUp(j);
              cy.wait(50);
            }
          }

          // Step 3: Click "Save & close" button
          QuickMarcEditor.pressSaveAndClose();
          InventoryInstance.waitLoading();

          cy.url().then((url) => {
            const derivedInstanceId = url.split('/').pop();
            testData.createdInstanceIds.push(derivedInstanceId);
          });

          // Step 4: Click Actions → "Edit MARC bibliographic record"
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.checkPaneheaderContains('Edit MARC record');
          QuickMarcEditor.verifyRowOrderByTags(testData.expectedOrderAfterMove);

          // Step 5: Close editing window and view source
          QuickMarcEditor.closeEditorPane();
          InventoryInstance.viewSource();

          const expectedSourceOrder = [
            'LDR',
            '001',
            '005',
            '800',
            '700',
            '650',
            '600',
            '245',
            '240',
            '110',
            '009',
            '008',
            '007',
            '006',
            '004',
            '002',
            '999',
          ];
          InventoryViewSource.verifyFieldsOrder(expectedSourceOrder);
        },
      );
    });
  });
});
