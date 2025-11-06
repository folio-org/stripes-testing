import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../support/constants';
import { Permissions } from '../../../../../support/dictionary';
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
    describe('Edit MARC bib', () => {
      describe('Manual linking', () => {
        const hotKeys = InventoryHotkeys.hotKeys;
        const testData = {
          linkedTag: '100',
          tag100: [
            11,
            '100',
            '1',
            '\\',
            '$a C365601 Chin, Staceyann, $d 1972-',
            '$e Author $e Narrator',
            '$0 http://id.loc.gov/authorities/names/n2008052404',
            '$1 http://viaf.org/viaf/24074052',
          ],
        };
        const marcFiles = [
          {
            marc: 'marcBibFileC365601.mrc',
            fileName: `C365601 autotestMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            numOfRecords: 1,
            propertyName: 'instance',
          },
          {
            marc: 'marcAuthFileC365601_1.mrc',
            fileName: `C365601 autotestMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
        ];
        const linkingTagAndValues = {
          rowIndex: 11,
          value: 'C365601 Chin, Staceyann, ',
          tag: '100',
        };
        const contributor = 'C365601 Chin, Staceyann, 1972-';
        const createdAuthorityIDs = [];

        before('Creating test user and an inventory instance', () => {
          cy.getAdminToken();
          // make sure there are no duplicate records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C365601*');

          cy.loginAsAdmin()
            .then(() => {
              cy.getAdminToken();
              marcFiles.forEach((marcFile) => {
                DataImport.uploadFileViaApi(
                  marcFile.marc,
                  marcFile.fileName,
                  marcFile.jobProfileToRun,
                ).then((response) => {
                  response.forEach((record) => {
                    createdAuthorityIDs.push(record[marcFile.propertyName].id);
                  });
                });
              });
            })
            .then(() => {
              cy.visit(TopMenu.inventoryPath);
              InventoryInstances.searchByTitle(createdAuthorityIDs[0]);
              InventoryInstances.selectInstance();
              InventoryInstance.editMarcBibliographicRecord();
              QuickMarcEditor.clickLinkIconInTagField(linkingTagAndValues.rowIndex);
              MarcAuthorities.switchToSearch();
              InventoryInstance.verifySelectMarcAuthorityModal();
              InventoryInstance.verifySearchOptions();
              InventoryInstance.searchResults(linkingTagAndValues.value);
              InventoryInstance.clickLinkButton();
              QuickMarcEditor.verifyAfterLinkingUsingRowIndex(
                linkingTagAndValues.tag,
                linkingTagAndValues.rowIndex,
              );
              QuickMarcEditor.pressSaveAndClose();
              QuickMarcEditor.checkAfterSaveAndClose();
            });

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ]).then((userProperties) => {
            testData.user = userProperties;

            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            }).then(() => {
              InventoryInstances.waitContentLoading();
              InventoryInstances.searchByTitle(createdAuthorityIDs[0]);
              InventoryInstances.selectInstance();
              InventoryInstance.editMarcBibliographicRecord();
            });
          });
        });

        after('Deleting test user and an inventory instance', () => {
          cy.getAdminToken().then(() => {
            Users.deleteViaApi(testData.user.userId);
            InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[0]);
            MarcAuthority.deleteViaAPI(createdAuthorityIDs[1]);
          });
        });

        it(
          'C365601 Cancel unlinking "MARC Bibliographic" field from "MARC Authority" record and use the "Cancel" button in editing window. (Spitfire) (TaaS)',
          { tags: ['extendedPath', 'spitfire', 'C365601'] },
          () => {
            QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(linkingTagAndValues.rowIndex);
            QuickMarcEditor.checkButtonsDisabled();
            QuickMarcEditor.verifyTagFieldAfterLinking(
              testData.tag100[0],
              testData.tag100[1],
              testData.tag100[2],
              testData.tag100[3],
              testData.tag100[4],
              testData.tag100[5],
              testData.tag100[6],
              testData.tag100[7],
            );
            QuickMarcEditor.checkUnlinkTooltipText(11, 'Unlink from MARC Authority record');
            QuickMarcEditor.clickUnlinkIconInTagField(linkingTagAndValues.rowIndex);
            QuickMarcEditor.checkUnlinkModal(testData.linkedTag);
            QuickMarcEditor.cancelUnlinkingField();
            QuickMarcEditor.checkDeleteModalClosed();
            QuickMarcEditor.clickUnlinkIconInTagField(linkingTagAndValues.rowIndex);
            QuickMarcEditor.checkUnlinkModal(testData.linkedTag);
            InventoryKeyboardShortcuts.pressHotKey(hotKeys.close);
            QuickMarcEditor.checkDeleteModalClosed();
            QuickMarcEditor.pressCancel();
            InstanceRecordView.verifyInstancePaneExists();
            InstanceRecordView.verifyContributorWithMarcAppLink(0, 1, contributor);
          },
        );
      });
    });
  });
});
