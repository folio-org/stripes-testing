import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
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
      let userData = {};
      const testData = {
        tag010: '010',
        tag100: '100',
        tag700: '700',
        tag010RowIndex: 4,
        tag700RowIndex: 56,
        field100Value: '$a C374161 Roberts, Julia, $d 1967-',
        field010Value: '$a n  91074080 ',
        new010tagValue: '01',
        searchOption: 'Keyword',
        searchValue: 'Roberts',
        authorityTitle: 'C374161 Roberts, Julia, 1967-',
        instanceTitle: 'Runaway bride',
        linked700Field: [
          56,
          '700',
          '1',
          '\\',
          '$a C374161 Roberts, Julia, $d 1967-',
          '$e Actor.',
          '$0 http://id.loc.gov/authorities/names/n91074080',
          '',
        ],
        calloutMessageError: 'Cannot delete 010. It is required.',
        calloutMessageSuccessfulSaving:
          'This record has successfully saved and is in process. Changes may not appear immediately.',
      };
      const marcFiles = [
        {
          marc: 'marcBibFileForC374161.mrc',
          fileName: `C374161 testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          propertyName: 'instance',
        },
        {
          marc: 'marcAuthFileForC374161.mrc',
          fileName: `C374161 testMarcFile.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          propertyName: 'authority',
        },
      ];
      const createdRecordIDs = [];

      before('Create test data', () => {
        cy.createTempUser([Permissions.moduleDataImportEnabled.gui])
          .then((userProperties) => {
            testData.preconditionUserId = userProperties.userId;
            InventoryInstances.deleteFullInstancesByTitleViaApi(testData.instanceTitle);
            MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C374161');

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
            cy.loginAsAdmin({
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            }).then(() => {
              InventoryInstances.searchByTitle(createdRecordIDs[0]);
              InventoryInstances.selectInstance();
              InventoryInstance.editMarcBibliographicRecord();
              InventoryInstance.verifyAndClickLinkIconByIndex(testData.tag700RowIndex);
              InventoryInstance.verifySelectMarcAuthorityModal();
              MarcAuthorities.switchToSearch();
              InventoryInstance.searchResults(testData.authorityTitle);
              MarcAuthorities.checkFieldAndContentExistence(
                testData.tag100,
                testData.field100Value,
              );
              InventoryInstance.clickLinkButton();
              QuickMarcEditor.verifyAfterLinkingUsingRowIndex(
                testData.tag700,
                testData.tag700RowIndex,
              );
              QuickMarcEditor.verifyTagFieldAfterLinking(...testData.linked700Field);
              QuickMarcEditor.closeCallout();
              QuickMarcEditor.pressSaveAndClose();
              QuickMarcEditor.checkAfterSaveAndClose();
            });
          })
          .then(() => {
            cy.createTempUser([
              Permissions.inventoryAll.gui,
              Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
              Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
              Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
              Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
            ]).then((createdUserProperties) => {
              userData = createdUserProperties;

              cy.login(userData.username, userData.password, {
                path: TopMenu.marcAuthorities,
                waiter: MarcAuthorities.waitLoading,
              });
            });
          });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(userData.userId);
        Users.deleteViaApi(testData.preconditionUserId);
        createdRecordIDs.forEach((id, index) => {
          if (index) MarcAuthority.deleteViaAPI(id);
          else InventoryInstance.deleteInstanceViaApi(id);
        });
      });

      it(
        'C374161 Delete "010" field of linked "MARC Authority" record when "010 $a" = "$0" (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire', 'C374161'] },
        () => {
          MarcAuthorities.searchByParameter(testData.searchOption, testData.searchValue);

          MarcAuthorities.selectTitle(testData.authorityTitle);
          MarcAuthorities.getViewPaneContent();
          MarcAuthority.edit();
          cy.wait(2000);
          QuickMarcEditor.checkContent(testData.field010Value, testData.tag010RowIndex);
          QuickMarcEditor.checkDeleteButtonNotExist(testData.tag010RowIndex);
          QuickMarcEditor.updateExistingTagName(testData.tag010, testData.new010tagValue);
          QuickMarcEditor.checkDeleteButtonExist(testData.tag010RowIndex);
          QuickMarcEditor.deleteField(testData.tag010RowIndex);
          QuickMarcEditor.afterDeleteNotification(testData.new010tagValue);
          QuickMarcEditor.verifySaveAndKeepEditingButtonEnabled();
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkCallout(testData.calloutMessageError);
          QuickMarcEditor.closeAllCallouts();
          cy.wait(1500);
          QuickMarcEditor.pressSaveAndKeepEditing(testData.calloutMessageError);
          QuickMarcEditor.closeAllCallouts();
          QuickMarcEditor.pressCancel();
          QuickMarcEditor.closeWithoutSavingInEditConformation();
          MarcAuthorities.verifyMarcViewPaneIsOpened();
          cy.get('@viewAuthorityPaneContent').then((viewAuthorityPaneContent) => {
            MarcAuthorities.verifyViewPaneContent(viewAuthorityPaneContent);
          });

          MarcAuthorities.closeMarcViewPane();
          MarcAuthorities.checkResultList([testData.authorityTitle]);

          MarcAuthorities.clickOnNumberOfTitlesLink(5, '1');
          InventoryInstance.verifyInstanceTitle(testData.instanceTitle);

          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.checkEditableQuickMarcFormIsOpened();
          QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(testData.tag700RowIndex);
          QuickMarcEditor.verifyTagFieldAfterLinking(...testData.linked700Field);

          QuickMarcEditor.clickUnlinkIconInTagField(testData.tag700RowIndex);
          QuickMarcEditor.confirmUnlinkingField(testData.tag700RowIndex);
          QuickMarcEditor.verifyIconsAfterUnlinking(testData.tag700RowIndex);
          QuickMarcEditor.verifyTagFieldAfterUnlinking(
            testData.tag700RowIndex,
            testData.tag700,
            testData.linked700Field[2],
            testData.linked700Field[3],
            `${testData.linked700Field[4]} ${testData.linked700Field[5]} ${testData.linked700Field[6]}`,
          );
          QuickMarcEditor.checkFourthBoxEditable(testData.tag700RowIndex, true);
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkCallout(testData.calloutMessageSuccessfulSaving);
          InventoryInstance.waitInventoryLoading();

          cy.visit(TopMenu.marcAuthorities);
          MarcAuthorities.waitLoading();
          MarcAuthorities.searchByParameter(testData.searchOption, testData.searchValue);
          MarcAuthorities.selectTitle(testData.authorityTitle);
          MarcAuthorities.verifyViewPaneContentExists();

          MarcAuthority.edit();
          QuickMarcEditor.checkContent(testData.field010Value, testData.tag010RowIndex);
          QuickMarcEditor.checkDeleteButtonExist(testData.tag010RowIndex);

          QuickMarcEditor.deleteField(testData.tag010RowIndex);
          QuickMarcEditor.afterDeleteNotification(testData.tag010);
          QuickMarcEditor.verifySaveAndKeepEditingButtonEnabled();
          QuickMarcEditor.verifySaveAndCloseButtonEnabled();
          QuickMarcEditor.pressSaveAndClose({ acceptDeleteModal: true });
          MarcAuthorities.waitLoading();
          MarcAuthorities.verifyViewPaneContentAbsent(testData.tag010);
        },
      );
    });
  });
});
