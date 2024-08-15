import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import { Permissions } from '../../../../support/dictionary';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Edit linked Authority record', () => {
      const testData = {
        tag100: '100',
        tag040: '040',
        tag952: '952',
        tag600: '600',
        authority100FieldValue: 'Clovio, Giulio',
        newAuthority100FieldValue: '$aClovio, Giulio,$d1498-1578 TEST',
        tag040NewValue: '0',
        tag952RowIndex: 18,
        tag600RowIndex: 25,
        searchOption: 'Keyword',
        calloutMessage: 'Tag must contain three characters and can only accept numbers 0-9.',
      };

      const marcFiles = [
        {
          marc: 'marcBibFileForC375171.mrc',
          fileName: `testMarcFileC375171.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          propertyName: 'instance',
        },
        {
          marc: 'marcAuthFileForC375171.mrc',
          fileName: `testMarcFileC375171.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          authorityHeading: 'Clovio, Giulio',
          propertyName: 'authority',
        },
      ];

      const createdRecordIDs = [];

      before('Create test data', () => {
        cy.getAdminToken();
        marcFiles.forEach((marcFile) => {
          DataImport.uploadFileViaApi(
            marcFile.marc,
            marcFile.fileName,
            marcFile.jobProfileToRun,
          ).then((response) => {
            response.forEach((record) => {
              createdRecordIDs.push(record[marcFile.propertyName].id);
            });
          });
        });

        cy.loginAsAdmin();
        cy.visit(TopMenu.inventoryPath).then(() => {
          InventoryInstances.searchByTitle(createdRecordIDs[0]);
          InventoryInstances.selectInstance();
          InventoryInstance.editMarcBibliographicRecord();
          InventoryInstance.verifyAndClickLinkIconByIndex(testData.tag600RowIndex);
          InventoryInstance.verifySelectMarcAuthorityModal();
          MarcAuthorities.switchToSearch();
          InventoryInstance.verifySearchOptions();
          InventoryInstance.searchResults(marcFiles[1].authorityHeading);
          MarcAuthorities.checkFieldAndContentExistence(
            testData.tag100,
            testData.authority100FieldValue,
          );
          InventoryInstance.clickLinkButton();
          QuickMarcEditor.verifyAfterLinkingUsingRowIndex(testData.tag600, testData.tag600RowIndex);
          QuickMarcEditor.pressSaveAndClose();
          cy.wait(1500);
          QuickMarcEditor.pressSaveAndClose();

          cy.createTempUser([
            Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          ]).then((createdUserProperties) => {
            testData.userProperties = createdUserProperties;

            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
        MarcAuthority.deleteViaAPI(createdRecordIDs[1]);
      });

      it(
        'C375171 Save linked "MARC authority" record with wrong tag value, updated "1XX" and deleted field (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire'] },
        () => {
          MarcAuthorities.searchBy(testData.searchOption, marcFiles[1].authorityHeading);

          MarcAuthority.edit();
          QuickMarcEditor.updateExistingTagName(testData.tag040, testData.tag040NewValue);
          QuickMarcEditor.checkButtonsEnabled();

          QuickMarcEditor.updateExistingField(testData.tag100, testData.newAuthority100FieldValue);
          QuickMarcEditor.checkContentByTag(testData.tag100, testData.newAuthority100FieldValue);

          QuickMarcEditor.deleteField(testData.tag952RowIndex);
          QuickMarcEditor.afterDeleteNotification(testData.tag952);

          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.checkErrorMessage(6, testData.calloutMessage);

          QuickMarcEditor.updateExistingTagName(testData.tag040NewValue, testData.tag040);
          QuickMarcEditor.pressSaveAndClose();
          cy.wait(1500);
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.verifyConfirmModal();

          QuickMarcEditor.confirmDelete();
          QuickMarcEditor.verifyUpdateLinkedBibsKeepEditingModal(1);

          QuickMarcEditor.confirmUpdateLinkedBibsKeepEditing(1);
          MarcAuthorities.verifyViewPaneContentExists();
        },
      );
    });
  });
});
