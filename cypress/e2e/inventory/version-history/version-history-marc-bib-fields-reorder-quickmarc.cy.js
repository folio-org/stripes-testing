import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import Users from '../../../support/fragments/users/users';
import VersionHistorySection from '../../../support/fragments/inventory/versionHistorySection';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import DataImport from '../../../support/fragments/data_import/dataImport';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';

describe('Inventory', () => {
  describe('MARC Bibliographic', () => {
    describe('Version history', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        initialVersionsCount: null,
        initialFieldOrder: [
          'LDR',
          '001',
          '005',
          '002',
          '004',
          '006',
          '007',
          '008',
          '009',
          '010',
          '035',
          '035',
          '035',
          '110',
          '240',
          '245',
          '600',
          '650',
          '700',
          '800',
          '999',
        ],
        expectedFieldOrder: [
          'LDR',
          '999',
          '800',
          '700',
          '650',
          '600',
          '245',
          '240',
          '110',
          '035',
          '035',
          '035',
          '010',
          '009',
          '008',
          '007',
          '006',
          '004',
          '002',
          '005',
          '001',
        ],
      };
      const permissions = [
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      ];
      const marcFile = {
        marc: 'marcBibFileC407737.mrc',
        fileName: `testMarcFileC407737_${randomPostfix}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      };

      before('Create test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteInstanceByTitleViaApi('C407737');

        cy.createTempUser(permissions).then((userProperties) => {
          testData.userProperties = userProperties;

          cy.getAdminToken();
          DataImport.uploadFileViaApi(
            marcFile.marc,
            marcFile.fileName,
            marcFile.jobProfileToRun,
          ).then((response) => {
            testData.uploadedRecordId = response[0].instance.id;

            cy.waitForAuthRefresh(() => {
              cy.login(testData.userProperties.username, testData.userProperties.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
              cy.reload();
              InventoryInstances.waitContentLoading();
            }, 20_000);
            InventoryInstances.searchByTitle(testData.uploadedRecordId);
            InventoryInstances.selectInstanceById(testData.uploadedRecordId);
            InventoryInstance.waitLoading();
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        InventoryInstance.deleteInstanceViaApi(testData.uploadedRecordId);
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C407737 Verify that all fields (except "LDR") can be moved and saved when editing "MARC bibliographic" record and check "Version history" (spitfire)',
        { tags: ['Extended', 'spitfire', 'C407737'] },
        () => {
          InventoryInstance.clickVersionHistoryButton();

          VersionHistorySection.waitLoading();
          VersionHistorySection.getVersionHistoryValue().then((versionsCount) => {
            testData.initialVersionsCount = versionsCount;
          });
          VersionHistorySection.clickCloseButton();

          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.waitLoading();

          testData.initialFieldOrder.forEach((tag, index) => {
            QuickMarcEditor.verifyTagValue(index, tag);
          });

          QuickMarcEditor.verifyEditableFieldIcons(1, false, true, false, false);
          QuickMarcEditor.verifyEditableFieldIcons(20, true, false, false);

          for (let movesCount = 19; movesCount >= 1; movesCount--) {
            for (let i = 0; i < movesCount; i++) {
              QuickMarcEditor.moveFieldUp(20 - i);
            }
          }

          testData.expectedFieldOrder.forEach((tag, index) => {
            QuickMarcEditor.verifyTagValue(index, tag);
          });

          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.checkAfterSaveAndKeepEditing();

          testData.expectedFieldOrder.forEach((tag, index) => {
            QuickMarcEditor.verifyTagValue(index, tag);
          });

          QuickMarcEditor.verifyEditableFieldIcons(1, false, true, false, true);
          QuickMarcEditor.verifyEditableFieldIcons(20, true, false, false, false);

          QuickMarcEditor.closeEditorPane();

          InventoryInstance.viewSource();
          InventoryViewSource.waitLoading();

          InventoryViewSource.verifyFieldsOrder(testData.expectedFieldOrder);

          InventoryViewSource.verifyVersionHistoryButtonShown();
          InventoryViewSource.clickVersionHistoryButton();

          VersionHistorySection.waitLoading();
          VersionHistorySection.getVersionHistoryValue().then((versionsCount) => {
            expect(versionsCount).to.equal(testData.initialVersionsCount);
          });
        },
      );
    });
  });
});
