import Permissions from '../../../../support/dictionary/permissions';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      const testData = {
        instanceTitle: `AT_C360096_MarcBibInstance_${getRandomPostfix()}`,
        tag008: '008',
        tag245: '245',
        tag555: '555',
        tag600: '600',
        tag700: '700',
        field600Content: '$a Subject C360096',
        field700Content: '$a Contributor C360096',
        field555Content: '$a Field555 C360096',
        addTo245: 'Test',
        headerStatus: 'Current',
      };

      const marcBibFields = [
        {
          tag: testData.tag008,
          content: QuickMarcEditor.defaultValid008Values,
        },
        {
          tag: testData.tag245,
          content: `$a ${testData.instanceTitle}`,
          indicators: ['1', '1'],
        },
        { tag: testData.tag600, content: testData.field600Content, indicators: ['1', '1'] },
        { tag: testData.tag700, content: testData.field700Content, indicators: ['1', '1'] },
      ];

      let createdInstanceId;
      let adminUser;

      before('Create test data', () => {
        cy.getAdminToken();
        cy.getAdminSourceRecord().then((record) => {
          adminUser = record;
        });
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
            (instanceId) => {
              createdInstanceId = instanceId;

              cy.waitForAuthRefresh(() => {
                cy.login(testData.userProperties.username, testData.userProperties.password, {
                  path: TopMenu.inventoryPath,
                  waiter: InventoryInstances.waitContentLoading,
                });
              }, 20_000);
            },
          );
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        InventoryInstance.deleteInstanceViaApi(createdInstanceId);
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C360096 Verify that click on the "Save & keep editing" button doesn\'t close the editing window of "MARC Bib" record (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C360096'] },
        () => {
          InventoryInstances.searchByTitle(createdInstanceId);
          InventoryInstances.selectInstanceById(createdInstanceId);
          InventoryInstance.waitLoading();
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.checkButtonsDisabled();
          QuickMarcEditor.checkMarcBibHeader(
            {
              instanceTitle: testData.instanceTitle,
              status: testData.headerStatus,
            },
            adminUser,
          );

          QuickMarcEditor.updateLDR06And07Positions();
          QuickMarcEditor.updateExistingField(
            testData.tag245,
            `$a ${testData.instanceTitle} ${testData.addTo245}`,
          );
          QuickMarcEditor.checkContentByTag(
            testData.tag245,
            `$a ${testData.instanceTitle} ${testData.addTo245}`,
          );
          QuickMarcEditor.checkButtonsEnabled();

          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.checkAfterSaveAndKeepEditing();
          QuickMarcEditor.closeAllCallouts();
          QuickMarcEditor.checkButtonsDisabled();
          QuickMarcEditor.checkMarcBibHeader(
            {
              instanceTitle: `${testData.instanceTitle} ${testData.addTo245}`,
              status: testData.headerStatus,
            },
            `${testData.userProperties.lastName}, ${testData.userProperties.firstName}`,
          );

          QuickMarcEditor.addNewField(testData.tag555, testData.field555Content, 6);
          QuickMarcEditor.checkContentByTag(testData.tag555, testData.field555Content);
          QuickMarcEditor.checkButtonsEnabled();

          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.checkAfterSaveAndKeepEditing();
          QuickMarcEditor.closeAllCallouts();
          QuickMarcEditor.checkButtonsDisabled();
          QuickMarcEditor.checkMarcBibHeader(
            {
              instanceTitle: `${testData.instanceTitle} ${testData.addTo245}`,
              status: testData.headerStatus,
            },
            `${testData.userProperties.lastName}, ${testData.userProperties.firstName}`,
          );

          cy.wait(4000);
          QuickMarcEditor.deleteFieldByTagAndCheck(testData.tag555);
          QuickMarcEditor.afterDeleteNotification(testData.tag555);
          QuickMarcEditor.checkButtonsEnabled();

          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.checkDeleteModal(1);
          QuickMarcEditor.confirmDelete();
          QuickMarcEditor.closeAllCallouts();
          QuickMarcEditor.checkFieldAbsense(testData.tag555);
          QuickMarcEditor.checkNoDeletePlaceholder();
          QuickMarcEditor.checkButtonsDisabled();
          QuickMarcEditor.checkMarcBibHeader(
            {
              instanceTitle: `${testData.instanceTitle} ${testData.addTo245}`,
              status: testData.headerStatus,
            },
            `${testData.userProperties.lastName}, ${testData.userProperties.firstName}`,
          );

          QuickMarcEditor.deleteFieldByTagAndCheck(testData.tag600);
          QuickMarcEditor.afterDeleteNotification(testData.tag600);
          QuickMarcEditor.checkButtonsEnabled();

          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.checkDeleteModal(1);
          QuickMarcEditor.clickRestoreDeletedField();
          QuickMarcEditor.checkNoDeletePlaceholder();
          QuickMarcEditor.checkContentByTag(testData.tag600, testData.field600Content);
          QuickMarcEditor.checkButtonsDisabled();

          QuickMarcEditor.moveFieldUp(6);
          QuickMarcEditor.verifyTagValue(5, testData.tag700);
          QuickMarcEditor.verifyTagValue(6, testData.tag600);
          QuickMarcEditor.checkButtonsEnabled();

          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.checkAfterSaveAndKeepEditing();
          QuickMarcEditor.closeAllCallouts();
          QuickMarcEditor.checkButtonsDisabled();
          QuickMarcEditor.checkMarcBibHeader(
            {
              instanceTitle: `${testData.instanceTitle} ${testData.addTo245}`,
              status: testData.headerStatus,
            },
            `${testData.userProperties.lastName}, ${testData.userProperties.firstName}`,
          );

          QuickMarcEditor.pressCancel();
          InventoryInstance.waitLoading();
          InventoryInstance.verifyInstanceTitle(`${testData.instanceTitle} ${testData.addTo245}`);

          InventoryInstance.viewSource();
          InventoryViewSource.contains(`$a ${testData.instanceTitle} ${testData.addTo245}`);
          InventoryViewSource.verifyExistanceOfValueInRow(testData.tag700, 5);
          InventoryViewSource.verifyExistanceOfValueInRow(testData.tag600, 6);
          InventoryViewSource.notContains(`\t${testData.tag555}\t`);
        },
      );
    });
  });
});
