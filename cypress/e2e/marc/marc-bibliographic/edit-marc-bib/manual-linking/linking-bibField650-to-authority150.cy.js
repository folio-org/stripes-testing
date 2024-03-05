import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import InstanceRecordView from '../../../../../support/fragments/inventory/instanceRecordView';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      describe('Manual linking', () => {
        const testData = {
          tag150: '150',
          tag010: '010',
          tag650: '650',
          authorityMarkedValue: 'C375070 Speaking Oratory',
          subjectValue: 'C375070 Speaking Oratory--debating',
          linkedIconText: 'Linked to MARC authority',
          accordion: 'Subject',
        };

        const marcFiles = [
          {
            marc: 'marcBibFileC375070.mrc',
            fileName: `testMarcFileC375070.${getRandomPostfix()}.mrc`,
            jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
            propertyName: 'relatedInstanceInfo',
          },
          {
            marc: 'marcAuthFileC375070.mrc',
            fileName: `testMarcFileC375070.${getRandomPostfix()}.mrc`,
            jobProfileToRun: 'Default - Create SRS MARC Authority',
            authorityHeading: 'C375070 Speaking Oratory debating',
            authority010FieldValue: 'sh85095299375070',
            propertyName: 'relatedAuthorityInfo',
          },
        ];

        const createdRecordIDs = [];

        const bib650LinkedFieldValues = [
          15,
          testData.tag650,
          '\\',
          '7',
          '$a C375070 Speaking Oratory $b debating',
          '',
          `$0 http://id.loc.gov/authorities/subjects/${marcFiles[1].authority010FieldValue}`,
          '$2 fast',
        ];

        const bib650UnlinkedFieldValues = [
          15,
          testData.tag650,
          '\\',
          '7',
          `$a C375070 Speaking Oratory $b debating $0 http://id.loc.gov/authorities/subjects/${marcFiles[1].authority010FieldValue} $2 fast`,
        ];

        before('Creating user', () => {
          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ]).then((createdUserProperties) => {
            testData.userProperties = createdUserProperties;

            cy.getAdminToken();
            marcFiles.forEach((marcFile) => {
              DataImport.uploadFileViaApi(
                marcFile.marc,
                marcFile.fileName,
                marcFile.jobProfileToRun,
              ).then((response) => {
                response.entries.forEach((record) => {
                  createdRecordIDs.push(record[marcFile.propertyName].idList[0]);
                });
              });
            });
          });
        });

        beforeEach('Login to the application', () => {
          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });

        after('Deleting created user', () => {
          cy.getAdminToken();
          Users.deleteViaApi(testData.userProperties.userId);
          createdRecordIDs.forEach((id, index) => {
            if (index) MarcAuthority.deleteViaAPI(id);
            else InventoryInstance.deleteInstanceViaApi(id);
          });
        });

        it(
          'C375070 Link the "650" of "MARC Bib" field with 150" field of "MARC Authority" record. (spitfire)',
          { tags: ['extendedPath', 'spitfire'] },
          () => {
            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            InventoryInstance.verifyAndClickLinkIcon(testData.tag650);
            MarcAuthorities.switchToSearch();
            InventoryInstance.verifySelectMarcAuthorityModal();
            InventoryInstance.searchResults(marcFiles[1].authorityHeading);
            MarcAuthorities.checkFieldAndContentExistence(
              testData.tag010,
              `$a ${marcFiles[1].authority010FieldValue}`,
            );
            MarcAuthorities.checkFieldAndContentExistence(
              testData.tag150,
              `$a ${testData.authorityMarkedValue}`,
            );
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag650);
            QuickMarcEditor.verifyTagFieldAfterLinking(...bib650LinkedFieldValues);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
            InventoryInstance.verifyInstanceSubject(
              2,
              0,
              `${testData.linkedIconText}${testData.subjectValue}`,
            );
            InventoryInstance.checkExistanceOfAuthorityIconInInstanceDetailPane(testData.accordion);
            InventoryInstance.clickViewAuthorityIconDisplayedInInstanceDetailsPane(
              testData.accordion,
            );
            MarcAuthorities.checkDetailViewIncludesText(testData.authorityMarkedValue);
            InventoryInstance.goToPreviousPage();
            // Wait for the content to be loaded.
            cy.wait(6000);
            InventoryInstance.waitLoading();
            InventoryInstance.viewSource();
            InventoryInstance.checkExistanceOfAuthorityIconInMarcViewPane();
            InventoryInstance.clickViewAuthorityIconDisplayedInMarcViewPane();
            MarcAuthorities.checkDetailViewIncludesText(testData.authorityMarkedValue);
            InventoryInstance.goToPreviousPage();
            // Wait for the content to be loaded.
            cy.wait(6000);
            InventoryViewSource.waitLoading();
            InventoryViewSource.close();
            InventoryInstance.waitLoading();
            InstanceRecordView.verifyInstancePaneExists();
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.clickUnlinkIconInTagField(bib650UnlinkedFieldValues[0]);
            QuickMarcEditor.confirmUnlinkingField();
            QuickMarcEditor.verifyTagFieldAfterUnlinking(...bib650UnlinkedFieldValues);
            QuickMarcEditor.verifyIconsAfterUnlinking(bib650UnlinkedFieldValues[0]);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
            InventoryInstance.checkAbsenceOfAuthorityIconInInstanceDetailPane(testData.accordion);
            InventoryInstance.viewSource();
            InventoryInstance.checkAbsenceOfAuthorityIconInMarcViewPane();
          },
        );
      });
    });
  });
});
