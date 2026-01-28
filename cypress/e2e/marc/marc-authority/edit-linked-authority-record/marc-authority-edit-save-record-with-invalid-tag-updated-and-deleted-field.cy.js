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
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';

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
        tag952RowIndex: 17,
        tag600RowIndex: 25,
        searchOption: 'Keyword',
        calloutMessage: 'Tag must contain three characters and can only accept numbers 0-9.',
      };

      const marcFiles = [
        {
          marc: 'marcBibFileForC375171.mrc',
          fileName: `C375171 testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          propertyName: 'instance',
        },
        {
          marc: 'marcAuthFileForC375171.mrc',
          fileName: `C375171 testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          authorityHeading: 'Clovio, Giulio',
          propertyName: 'authority',
        },
      ];

      const createdRecordIDs = [];

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('Clovio, Giulio');
        InventoryInstances.deleteInstanceByTitleViaApi('C375171');
        cy.createTempUser([Permissions.moduleDataImportEnabled.gui])
          .then((userProperties) => {
            testData.preconditionUserId = userProperties.userId;

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
              cy.wait(2000);
            });
          })
          .then(() => {
            cy.waitForAuthRefresh(() => {
              cy.loginAsAdmin();
              cy.visit(TopMenu.inventoryPath);
              InventoryInstances.waitContentLoading();
            }, 20_000);
            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            cy.ifConsortia(true, () => {
              InventorySearchAndFilter.byShared('No');
            });
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            InventoryInstance.verifyAndClickLinkIconByIndex(testData.tag600RowIndex);
            InventoryInstance.verifySelectMarcAuthorityModal();
            MarcAuthorities.switchToSearch();
            InventoryInstance.verifySearchOptions();
            InventoryInstance.searchResults(marcFiles[1].authorityHeading);
            cy.ifConsortia(true, () => {
              MarcAuthorities.clickAccordionByName('Shared');
              MarcAuthorities.actionsSelectCheckbox('No');
            });
            MarcAuthorities.checkFieldAndContentExistence(
              testData.tag100,
              testData.authority100FieldValue,
            );
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingUsingRowIndex(
              testData.tag600,
              testData.tag600RowIndex,
            );
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
          })
          .then(() => {
            cy.createTempUser([
              Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
              Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
              Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
            ]).then((createdUserProperties) => {
              testData.userProperties = createdUserProperties;

              cy.waitForAuthRefresh(() => {
                cy.login(testData.userProperties.username, testData.userProperties.password, {
                  path: TopMenu.marcAuthorities,
                  waiter: MarcAuthorities.waitLoading,
                });
              }, 20_000);
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
        { tags: ['extendedPath', 'spitfire', 'C375171'] },
        () => {
          MarcAuthorities.searchBy(testData.searchOption, marcFiles[1].authorityHeading);
          cy.ifConsortia(true, () => {
            MarcAuthorities.clickAccordionByName('Shared');
            MarcAuthorities.actionsSelectCheckbox('No');
          });

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
          QuickMarcEditor.pressSaveAndCloseButton();
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
