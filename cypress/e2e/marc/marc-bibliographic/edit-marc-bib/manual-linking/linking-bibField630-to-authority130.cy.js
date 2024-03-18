import { Permissions } from '../../../../../support/dictionary';
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
          tag630: '630',
          authorityMarkedValue: 'C375069 Marvel comics',
          subjectValue: 'C375069 Marvel comics ComiCon--Periodicals.--United States',
          authorityIconText: 'Linked to MARC authority',
          accordion: 'Subject',
        };

        const marcFiles = [
          {
            marc: 'marcBibFileForC375069.mrc',
            fileName: `testMarcBibFileC375071.${getRandomPostfix()}.mrc`,
            jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
            propertyName: 'relatedInstanceInfo',
          },
          {
            marc: 'marcAuthFileForC375069.mrc',
            fileName: `testMarcAuthFileC375071.${getRandomPostfix()}.mrc`,
            jobProfileToRun: 'Default - Create SRS MARC Authority',
            authorityHeading: 'C375069 Marvel comics ComiCon',
            propertyName: 'relatedAuthorityInfo',
          },
        ];

        const createdRecordIDs = [];
        const bib630InitialFieldValues = [
          23,
          testData.tag630,
          '0',
          '7',
          '$a C375069 Marvel comics. $2 fast $0 (OCoLC)fst01373594 $v Periodicals. $z United States $w 830',
        ];
        const bib630UnlinkedFieldValues = [
          23,
          testData.tag630,
          '0',
          '7',
          '$a C375069 Marvel comics $t ComiCon $v Periodicals. $z United States $w 830 $0 80026955 $2 fast',
        ];
        const bib630LinkedFieldValues = [
          23,
          testData.tag630,
          '0',
          '7',
          '$a C375069 Marvel comics $t ComiCon',
          '$v Periodicals. $z United States $w 830',
          '$0 80026955',
          '$2 fast',
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

            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
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
          'C375069 Link the "630" of "MARC Bib" field with "130" field of "MARC Authority" record. (spitfire) (TaaS)',
          { tags: ['extendedPath', 'spitfire'] },
          () => {
            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.verifyTagFieldAfterUnlinking(...bib630InitialFieldValues);
            InventoryInstance.verifyAndClickLinkIcon(testData.tag630);
            MarcAuthorities.switchToSearch();
            InventoryInstance.verifySelectMarcAuthorityModal();
            InventoryInstance.searchResults(marcFiles[1].authorityHeading);
            MarcAuthorities.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag630);
            QuickMarcEditor.verifyTagFieldAfterLinking(...bib630LinkedFieldValues);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
            InventoryInstance.verifyInstanceSubject(
              2,
              0,
              `${testData.authorityIconText}${testData.subjectValue}`,
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
            QuickMarcEditor.verifyTagFieldAfterLinking(...bib630LinkedFieldValues);
            QuickMarcEditor.clickUnlinkIconInTagField(bib630UnlinkedFieldValues[0]);
            QuickMarcEditor.confirmUnlinkingField();
            QuickMarcEditor.verifyTagFieldAfterUnlinking(...bib630UnlinkedFieldValues);
            QuickMarcEditor.verifyIconsAfterUnlinking(bib630UnlinkedFieldValues[0]);
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
