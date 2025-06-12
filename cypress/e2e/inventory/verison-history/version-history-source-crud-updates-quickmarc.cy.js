import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import Users from '../../../support/fragments/users/users';
import VersionHistorySection from '../../../support/fragments/inventory/versionHistorySection';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES, DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import DateTools from '../../../support/utils/dateTools';
import DataImport from '../../../support/fragments/data_import/dataImport';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';

describe('Inventory', () => {
  describe('MARC Bibliographic', () => {
    describe('Version history', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        instanceTitle: 'AT_C692071_MarcBibInstance',
        tag245: '245',
        valid245IndicatorValue: '1',
        date: DateTools.getFormattedDateWithSlashes({ date: new Date() }),
        addedField: {
          tag: '700',
          content: ['1', '\\', '$a Staceyann Chin $d 1972-'],
          indexAbove: 30,
        },
        updatedField: { tag: '240', content: ['2', '1', '$a Laws and Suits, etc.'] },
        deletedField: { tag: '260' },
        combinedUpdate: {
          addedField: {
            tag: '600',
            content: ['1', '\\', "$a Duck hunting $z duck's field"],
            indexAbove: 30,
          },
          updatedField: { tag: '110', content: ['\\', '\\', '$a California $b Bear.'] },
          deletedField: { index: 19 },
        },
      };
      const permissions = [
        Permissions.uiInventoryViewInstances.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
      ];
      const marcFile = {
        marc: 'marcBibFileC692071.mrc',
        fileName: `testMarcFileC692071${randomPostfix}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      };

      before('Create test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteInstanceByTitleViaApi('C692071');

        cy.createTempUser(permissions).then((userProperties) => {
          testData.userProperties = userProperties;

          cy.getUsers({ limit: 1, query: `"username"="${Cypress.env('diku_login')}"` }).then(
            (user) => {
              testData.adminLastName = user[0].personal.lastName;
              testData.adminFirstName = user[0].personal.firstName;
            },
          );

          DataImport.uploadFileViaApi(
            marcFile.marc,
            marcFile.fileName,
            marcFile.jobProfileToRun,
          ).then((response) => {
            testData.createdRecordId = response[0].instance.id;

            cy.waitForAuthRefresh(() => {
              cy.login(testData.userProperties.username, testData.userProperties.password);
              TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
              InventoryInstances.waitContentLoading();
              cy.reload();
              InventoryInstances.waitContentLoading();
            }, 20_000);
            InventoryInstances.searchByTitle(testData.createdRecordId);
            InventoryInstances.selectInstanceById(testData.createdRecordId);
            InventoryInstance.checkInstanceTitle(testData.instanceTitle);
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        InventoryInstance.deleteInstanceViaApi(testData.createdRecordId);
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C692071 Check "Version history" pane after CRUD field and subfield in "MARC bibliographic" record via "quickmarc" (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C692071'] },
        () => {
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.addNewField(
            testData.addedField.tag,
            testData.addedField.content[2],
            testData.addedField.indexAbove,
          );
          QuickMarcEditor.updateIndicatorValue(testData.tag245, testData.addedField.content[0], 0);
          QuickMarcEditor.updateIndicatorValue(testData.tag245, testData.addedField.content[1], 1);
          QuickMarcEditor.saveAndKeepEditingWithValidationWarnings();
          QuickMarcEditor.checkAfterSaveAndKeepEditing();

          QuickMarcEditor.updateExistingField(
            testData.updatedField.tag,
            testData.updatedField.content[2],
          );
          QuickMarcEditor.updateIndicatorValue(
            testData.tag245,
            testData.updatedField.content[0],
            0,
          );
          QuickMarcEditor.updateIndicatorValue(
            testData.tag245,
            testData.updatedField.content[1],
            1,
          );
          QuickMarcEditor.saveAndKeepEditingWithValidationWarnings();
          QuickMarcEditor.checkAfterSaveAndKeepEditing();

          QuickMarcEditor.deleteFieldByTagAndCheck(testData.deletedField.tag);
          QuickMarcEditor.saveAndKeepEditingWithValidationWarnings();
          QuickMarcEditor.constinueWithSaveAndCheck();

          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.addNewField(
            testData.combinedUpdate.addedField.tag,
            testData.combinedUpdate.addedField.content[2],
            testData.combinedUpdate.addedField.indexAbove,
          );
          QuickMarcEditor.updateIndicatorValue(
            testData.tag245,
            testData.combinedUpdate.addedField.content[0],
            0,
          );
          QuickMarcEditor.updateIndicatorValue(
            testData.tag245,
            testData.combinedUpdate.addedField.content[1],
            1,
          );
          QuickMarcEditor.updateExistingField(
            testData.combinedUpdate.updatedField.tag,
            testData.combinedUpdate.updatedField.content[2],
          );
          QuickMarcEditor.updateIndicatorValue(
            testData.tag245,
            testData.combinedUpdate.updatedField.content[0],
            0,
          );
          QuickMarcEditor.updateIndicatorValue(
            testData.tag245,
            testData.combinedUpdate.updatedField.content[1],
            1,
          );
          QuickMarcEditor.deleteField(testData.combinedUpdate.deletedField.index);
          QuickMarcEditor.saveAndCloseWithValidationWarnings({ acceptDeleteModal: true });
          QuickMarcEditor.checkAfterSaveAndClose();

          InventoryInstance.viewSource();
          InventoryViewSource.verifyVersionHistoryButtonShown();
          InventoryViewSource.clickVersionHistoryButton();
          VersionHistorySection.verifyVersionHistoryPane();
          VersionHistorySection.verifyVersionHistoryCard(
            4,
            testData.date,
            testData.adminFirstName,
            testData.adminLastName,
            true,
          );
        },
      );
    });
  });
});
