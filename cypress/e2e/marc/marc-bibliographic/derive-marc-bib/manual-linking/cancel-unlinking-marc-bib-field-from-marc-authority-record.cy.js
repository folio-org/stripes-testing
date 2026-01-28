import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../support/constants';
import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import InstanceRecordView from '../../../../../support/fragments/inventory/instanceRecordView';
import InventoryHotkeys from '../../../../../support/fragments/inventory/inventoryHotkeys';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventoryKeyboardShortcuts from '../../../../../support/fragments/inventory/inventoryKeyboardShortcuts';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      describe('Manual linking', () => {
        const hotKeys = InventoryHotkeys.hotKeys;
        const testData = {
          tag700: '700',
          tag100: '100',
          tag100content: 'C365603 Sprouse, Chris',
        };
        const marcFiles = [
          {
            marc: 'marcBibFileForC365603.mrc',
            fileName: `testMarcFileC365603${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            numOfRecords: 1,
            propertyName: 'instance',
          },
          {
            marc: 'marcAuthFileC365603_1.mrc',
            fileName: `testMarcFileC365603${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
          {
            marc: 'marcAuthFileC365603_2.mrc',
            fileName: `testMarcFileC365603${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
        ];
        const linkingTagAndValues = [
          {
            rowIndex: 75,
            value: 'C365603 Sprouse, Chris',
            tag: 700,
          },
          {
            rowIndex: 78,
            value: 'C365603 Martin, Laura (Comic book artist)',
            tag: 700,
          },
        ];
        const bib700AfterLinkingToAuth100 = [
          75,
          testData.tag700,
          '1',
          '\\',
          '$a C365603 Sprouse, Chris',
          '$e artist.',
          '$0 1357871',
          '',
        ];
        const createdRecordsIDs = [];

        before('Creating user and test data', () => {
          cy.getAdminToken();
          // make sure there are no duplicate authority records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C365603*');

          marcFiles.forEach((marcFile) => {
            DataImport.uploadFileViaApi(
              marcFile.marc,
              marcFile.fileName,
              marcFile.jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                createdRecordsIDs.push(record[marcFile.propertyName].id);
              });
            });
          });

          cy.loginAsAdmin({
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          }).then(() => {
            InventoryInstances.searchByTitle(createdRecordsIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            linkingTagAndValues.forEach((linking) => {
              QuickMarcEditor.clickLinkIconInTagField(linking.rowIndex);
              MarcAuthorities.switchToSearch();
              InventoryInstance.verifySelectMarcAuthorityModal();
              InventoryInstance.verifySearchOptions();
              InventoryInstance.searchResults(linking.value);
              InventoryInstance.clickLinkButton();
              QuickMarcEditor.verifyAfterLinkingUsingRowIndex(linking.tag, linking.rowIndex);
            });
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
          });

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ]).then((createdUserProperties) => {
            testData.userData = createdUserProperties;

            cy.waitForAuthRefresh(() => {
              cy.login(testData.userData.username, testData.userData.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
            }, 20_000);
            InventoryInstances.searchByTitle(createdRecordsIDs[0]);
            InventoryInstances.selectInstance();
          });
        });

        after('Deleting created user and data', () => {
          cy.getAdminToken().then(() => {
            Users.deleteViaApi(testData.userData.userId);
            InventoryInstance.deleteInstanceViaApi(createdRecordsIDs[0]);
            MarcAuthority.deleteViaAPI(createdRecordsIDs[1], true);
            MarcAuthority.deleteViaAPI(createdRecordsIDs[2], true);
          });
        });

        it(
          'C365603 Derive | Cancel unlinking "MARC Bibliographic" field from "MARC Authority" record and use the "Save & close" button in deriving window. (spitfire) (TaaS)',
          { tags: ['extendedPath', 'spitfire', 'C365603'] },
          () => {
            InventoryInstance.deriveNewMarcBibRecord();
            QuickMarcEditor.verifyRemoveLinkingModal();
            InventoryKeyboardShortcuts.pressHotKey(hotKeys.close);
            QuickMarcEditor.checkEditableQuickMarcFormIsOpened();
            QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(linkingTagAndValues[0].rowIndex);
            QuickMarcEditor.verifySaveAndCloseButtonDisabled();
            QuickMarcEditor.verifyTagFieldAfterLinking(...bib700AfterLinkingToAuth100);
            QuickMarcEditor.checkUnlinkTooltipText(75, 'Unlink from MARC Authority record');
            QuickMarcEditor.clickUnlinkIconInTagField(linkingTagAndValues[0].rowIndex);
            QuickMarcEditor.checkUnlinkModal(testData.tag700);
            QuickMarcEditor.cancelUnlinkingField();
            QuickMarcEditor.checkDeleteModalClosed();
            QuickMarcEditor.verifySaveAndCloseButtonDisabled();
            QuickMarcEditor.clickUnlinkIconInTagField(linkingTagAndValues[0].rowIndex);
            QuickMarcEditor.checkUnlinkModal(testData.tag700);
            InventoryKeyboardShortcuts.pressHotKey(hotKeys.close);
            QuickMarcEditor.checkDeleteModalClosed();
            QuickMarcEditor.verifySaveAndCloseButtonDisabled();
            QuickMarcEditor.checkViewMarcAuthorityTooltipText(linkingTagAndValues[0].rowIndex);
            QuickMarcEditor.clickViewMarcAuthorityIconInTagField(linkingTagAndValues[0].rowIndex);
            MarcAuthorities.checkFieldAndContentExistence(testData.tag100, testData.tag100content);

            cy.go('back');
            cy.wait(1000);
            QuickMarcEditor.clickKeepLinkingButton();
            QuickMarcEditor.updateExistingField('100', '$a Coates, Ta-Nehisi, $e creator.');
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkCallout('Record created.');
            InstanceRecordView.verifyInstancePaneExists();
            InstanceRecordView.verifyContributorNameWithMarcAppIcon(
              2,
              1,
              linkingTagAndValues[0].value,
            );
            InstanceRecordView.verifyContributorNameWithMarcAppIcon(
              5,
              1,
              linkingTagAndValues[1].value,
            );
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.verifyTagFieldAfterLinking(
              72,
              testData.tag700,
              '1',
              '\\',
              '$a C365603 Sprouse, Chris',
              '$e artist.',
              '$0 1357871',
              '',
            );
          },
        );
      });
    });
  });
});
