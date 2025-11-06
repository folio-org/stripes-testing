import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../support/constants';
import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
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
        const testData = {
          tag100: '110',
          tag240: '240',
          newTag240Content: '$a C374111 Testing $g European Economic Community, $d 1977 Jan. 18',
          authority110FieldValue: 'C374111 Egypt.',
          authorityIconText: 'Linked to MARC authority',
          calloutMessage:
            'This record has successfully saved and is in process. Changes may not appear immediately.',
          accordion: 'Title data',
        };

        const marcFiles = [
          {
            marc: 'marcBibFileC374111.mrc',
            fileName: `testMarcFileC374111${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            propertyName: 'instance',
            numOfRecords: 1,
            instanceAlternativeTitle:
              'Treaties, etc. Israel, 1978 September 17 (Framework for Peace in the Middle East)',
          },
          {
            marc: 'marcAuthFileC374111.mrc',
            fileName: `testMarcFileC374111${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
        ];
        const bib240AfterLinkingToAuth110 = [
          10,
          testData.tag240,
          '1',
          '0',
          '$a Treaties, etc. $g Israel, $d 1978 September 17 (Framework for Peace in the Middle East)',
          '',
          '$0 http://id.loc.gov/authorities/names/n91006627',
          '',
        ];
        const bib240AfterUninkingToAuth110 = [
          10,
          testData.tag240,
          '1',
          '0',
          '$a Treaties, etc. $g Israel, $d 1978 September 17 (Framework for Peace in the Middle East) $0 http://id.loc.gov/authorities/names/n91006627',
        ];

        const createdAuthorityIDs = [];

        before('Creating user', () => {
          cy.getAdminToken();
          // make sure there are no duplicate authority records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C374111*');

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ]).then((createdUserProperties) => {
            testData.userProperties = createdUserProperties;

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

            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });

        after('Deleting created user', () => {
          cy.getAdminToken().then(() => {
            Users.deleteViaApi(testData.userProperties.userId);
            InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[0]);
            createdAuthorityIDs.forEach((id, index) => {
              if (index) MarcAuthority.deleteViaAPI(id);
            });
          });
        });

        it(
          'C374111 Link the "240" of "MARC Bib" field with "110" field with a $t of "MARC Authority" record. (spitfire) (TaaS)',
          { tags: ['extendedPath', 'spitfire', 'C374111'] },
          () => {
            InventoryInstances.searchByTitle(createdAuthorityIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.updateExistingField(testData.tag240, testData.newTag240Content);
            QuickMarcEditor.checkContent(testData.newTag240Content, 10);
            InventoryInstance.verifyAndClickLinkIcon(testData.tag240);
            MarcAuthorities.switchToSearch();
            InventoryInstance.verifySelectMarcAuthorityModal();
            InventoryInstance.verifySearchOptions();
            InventoryInstance.searchResults(testData.authority110FieldValue);
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag240);
            QuickMarcEditor.checkUnlinkTooltipText(10, 'Unlink from MARC Authority record');
            QuickMarcEditor.checkViewMarcAuthorityTooltipText(bib240AfterLinkingToAuth110[0]);
            QuickMarcEditor.verifyTagFieldAfterLinking(...bib240AfterLinkingToAuth110);
            QuickMarcEditor.pressSaveAndClose();
            cy.wait(1500);
            QuickMarcEditor.checkAfterSaveAndClose();
            InventoryInstance.waitInventoryLoading();
            InventoryInstance.verifyAlternativeTitle(
              0,
              1,
              `${testData.authorityIconText}${marcFiles[0].instanceAlternativeTitle}`,
            );
            InventoryInstance.clickViewAuthorityIconDisplayedInInstanceDetailsPane(
              testData.accordion,
            );
            MarcAuthorities.checkRecordDetailPageMarkedValue(testData.authority110FieldValue);

            cy.visit(TopMenu.inventoryPath);
            InventoryInstances.searchByTitle(createdAuthorityIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.verifyTagFieldAfterLinking(...bib240AfterLinkingToAuth110);
            QuickMarcEditor.clickUnlinkIconInTagField(10);
            QuickMarcEditor.confirmUnlinkingField();
            QuickMarcEditor.verifyTagFieldAfterUnlinking(...bib240AfterUninkingToAuth110);
            cy.wait(1500);
            QuickMarcEditor.pressSaveAndKeepEditing(testData.calloutMessage);
            QuickMarcEditor.verifyTagFieldAfterUnlinking(...bib240AfterUninkingToAuth110);
          },
        );
      });
    });
  });
});
