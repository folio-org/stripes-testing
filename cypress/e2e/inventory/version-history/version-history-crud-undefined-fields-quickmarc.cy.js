import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import Users from '../../../support/fragments/users/users';
import VersionHistorySection from '../../../support/fragments/inventory/versionHistorySection';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import DateTools from '../../../support/utils/dateTools';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';

describe('Inventory', () => {
  describe('MARC Bibliographic', () => {
    describe('Version history', { retries: { runMode: 1 } }, () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        instanceTitle: `AT_C692116_MarcBibInstance_${randomPostfix}`,
        date: DateTools.getFormattedDateWithSlashes({ date: new Date() }),
        createdRecordId: null,
        userProperties: null,
        undefinedField: {
          rowIndex: 7,
          tag: '998',
          indicators: ['3', '1'],
          created: '$a Undefined field $b created',
          updated: '$a Undefined field $b updated',
        },
        field700: {
          rowIndex: 4,
          tag: '700',
          indicators: ['1', '\\'],
          original: '$a Mirabelli, Cesare.',
          withUndefinedSubfield: '$a Mirabelli, Cesare. $w undefined subfield',
          withUpdatedSubfield: '$a Mirabelli, Cesare. $w undefined subfield updated',
        },
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
          content: `$6 880-01 $a ${testData.instanceTitle}`,
          indicators: ['1', '0'],
        },
        {
          tag: '700',
          content: testData.field700.original,
          indicators: testData.field700.indicators,
        },
        {
          tag: '700',
          content: '$a Johnson, Mary. $d 1955-',
          indicators: ['0', '2'],
        },
        {
          tag: '700',
          content: '$a Johnson, Mary. $d 1950-',
          indicators: ['1', '2'],
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
        'C692116 Check "Version history" panes of MARC and FOLIO records after CRUD of Undefined fields and subfield in "MARC bibliographic" record via "quickmarc" (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C692116'] },
        () => {
          // Step 1: Open QuickMarcEditor
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.waitLoading();

          // Step 2: Add undefined field 998
          MarcAuthority.addNewField(
            testData.undefinedField.rowIndex,
            testData.undefinedField.tag,
            testData.undefinedField.created,
            testData.undefinedField.indicators[0],
            testData.undefinedField.indicators[1],
          );
          QuickMarcEditor.verifySaveAndKeepEditingButtonEnabled();
          QuickMarcEditor.clickSaveAndKeepEditing();
          QuickMarcEditor.closeAllCallouts();

          QuickMarcEditor.verifyTagField(
            testData.undefinedField.rowIndex + 1,
            testData.undefinedField.tag,
            testData.undefinedField.indicators[0],
            testData.undefinedField.indicators[1],
            testData.undefinedField.created,
            '',
          );

          QuickMarcEditor.updateExistingField(
            testData.undefinedField.tag,
            testData.undefinedField.updated,
          );
          QuickMarcEditor.verifySaveAndKeepEditingButtonEnabled();
          QuickMarcEditor.clickSaveAndKeepEditing();
          QuickMarcEditor.closeAllCallouts();

          QuickMarcEditor.verifyTagField(
            testData.undefinedField.rowIndex + 1,
            testData.undefinedField.tag,
            testData.undefinedField.indicators[0],
            testData.undefinedField.indicators[1],
            testData.undefinedField.updated,
            '',
          );

          // Step 4: Delete undefined field 998
          QuickMarcEditor.deleteFieldByTagAndCheck(testData.undefinedField.tag);
          QuickMarcEditor.afterDeleteNotification(testData.undefinedField.tag);
          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.checkDeleteModal(1);
          QuickMarcEditor.confirmDelete();
          QuickMarcEditor.closeAllCallouts();

          // Step 5: Add undefined subfield $w in field 700
          cy.wait(1000);
          QuickMarcEditor.updateFirstFieldByTag(
            testData.field700.tag,
            testData.field700.withUndefinedSubfield,
          );
          QuickMarcEditor.verifySaveAndKeepEditingButtonEnabled();
          QuickMarcEditor.clickSaveAndKeepEditing();
          QuickMarcEditor.closeAllCallouts();

          QuickMarcEditor.verifyTagField(
            testData.field700.rowIndex + 1,
            testData.field700.tag,
            testData.field700.indicators[0],
            testData.field700.indicators[1],
            testData.field700.withUndefinedSubfield,
            '',
          );
          // Step 6: Update undefined subfield $w in field 700
          QuickMarcEditor.updateFirstFieldByTag(
            testData.field700.tag,
            testData.field700.withUpdatedSubfield,
          );
          QuickMarcEditor.verifySaveAndKeepEditingButtonEnabled();
          QuickMarcEditor.clickSaveAndKeepEditing();
          QuickMarcEditor.closeAllCallouts();

          QuickMarcEditor.verifyTagField(
            testData.field700.rowIndex + 1,
            testData.field700.tag,
            testData.field700.indicators[0],
            testData.field700.indicators[1],
            testData.field700.withUpdatedSubfield,
            '',
          );

          // Step 7: Delete undefined subfield $w from field 700
          QuickMarcEditor.deleteFirstFieldByTag(testData.field700.tag);
          QuickMarcEditor.afterDeleteNotification(testData.field700.tag);
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkDeleteModal(1);
          QuickMarcEditor.confirmDelete();
          QuickMarcEditor.closeAllCallouts();
          InventoryInstance.waitLoading();

          // Step 8: Check Version History from Instance pane (no versions)
          InventoryInstance.clickVersionHistoryButton();
          VersionHistorySection.waitLoading();
          VersionHistorySection.verifyVersionsCount(2);
          VersionHistorySection.clickCloseButton();

          // Step 9: Open Version History from MARC View Source (7 versions)
          InventoryInstance.viewSource();
          InventoryViewSource.waitLoading();
          InventoryViewSource.verifyVersionHistoryButtonShown();
          InventoryViewSource.clickVersionHistoryButton();
          VersionHistorySection.waitLoading();
          VersionHistorySection.verifyVersionHistoryPane(7);

          for (let i = 0; i < 6; i++) {
            VersionHistorySection.verifyVersionHistoryCard(
              i,
              testData.date,
              testData.userProperties.firstName,
              testData.userProperties.lastName,
              false,
              i === 0,
            );
          }

          // Step 10: Verify first card modal (delete undefined subfield)
          VersionHistorySection.openChangesForCard(0);
          VersionHistorySection.verifyChangesModal(
            testData.date,
            testData.userProperties.firstName,
            testData.userProperties.lastName,
          );
          VersionHistorySection.checkChangeInModal(
            'Removed',
            '700',
            '1  ' + testData.field700.withUpdatedSubfield,
            'No value set-',
          );
          VersionHistorySection.closeChangesModal();

          // Step 11: Verify second card modal (update undefined subfield)
          VersionHistorySection.openChangesForCard(1);
          VersionHistorySection.checkChangeInModal(
            'Added',
            '700',
            'No value set-',
            '1  ' + testData.field700.withUpdatedSubfield,
          );
          VersionHistorySection.checkChangeInModal(
            'Removed',
            '700',
            '1  ' + testData.field700.withUndefinedSubfield,
            'No value set-',
          );
          VersionHistorySection.closeChangesModal();

          // Step 12: Verify third card modal (add undefined subfield)
          VersionHistorySection.openChangesForCard(2);
          VersionHistorySection.checkChangeInModal(
            'Added',
            '700',
            'No value set-',
            '1  ' + testData.field700.withUndefinedSubfield,
          );
          VersionHistorySection.checkChangeInModal(
            'Removed',
            '700',
            '1  ' + testData.field700.original,
            'No value set-',
          );
          VersionHistorySection.closeChangesModal();

          // Step 13: Verify fourth card modal (delete undefined field 998)
          VersionHistorySection.openChangesForCard(3);
          VersionHistorySection.checkChangeInModal(
            'Removed',
            '998',
            '31 ' + testData.undefinedField.updated,
            'No value set-',
          );
          VersionHistorySection.closeChangesModal();

          // Step 14: Verify fifth card modal (update undefined field 998)
          VersionHistorySection.openChangesForCard(4);
          VersionHistorySection.checkChangeInModal(
            'Edited',
            '998',
            '31 ' + testData.undefinedField.created,
            '31 ' + testData.undefinedField.updated,
          );
          VersionHistorySection.closeChangesModal();

          // Step 15: Verify sixth card modal (add undefined field 998)
          VersionHistorySection.openChangesForCard(5);
          VersionHistorySection.checkChangeInModal(
            'Added',
            '998',
            'No value set-',
            '31 ' + testData.undefinedField.created,
          );

          VersionHistorySection.closeChangesModal();
          VersionHistorySection.clickCloseButton();
        },
      );
    });
  });
});
