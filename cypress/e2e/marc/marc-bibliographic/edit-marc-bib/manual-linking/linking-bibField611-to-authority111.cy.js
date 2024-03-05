import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';
import MarcAuthorityBrowse from '../../../../../support/fragments/marcAuthority/MarcAuthorityBrowse';
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
          tag611: '611',
          authorityValue:
            'C380764 Vatican Council (2nd : 1962-1965 : Basilica di San Pietro in Vaticano)',
          authorityHeading:
            'C380764 Vatican Council Basilica di San Pietro in Vaticano) 1962-1965 : (2nd :',
          linkedIconText: 'Linked to MARC authority',
          accordion: 'Subject',
          searchOptionCorporateName: 'Corporate/Conference name',
          authorized: 'Authorized',
        };

        const marcFiles = [
          {
            marc: 'marcBibFileForC380764.mrc',
            fileName: `testMarcFileC380764.${getRandomPostfix()}.mrc`,
            jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
            propertyName: 'relatedInstanceInfo',
          },
          {
            marc: 'marcAuthFileForC380764.mrc',
            fileName: `testMarcFileC380764.${getRandomPostfix()}.mrc`,
            jobProfileToRun: 'Default - Create SRS MARC Authority',
            propertyName: 'relatedAuthorityInfo',
          },
        ];

        const createdRecordIDs = [];

        const bib611FieldValues = [
          15,
          testData.tag611,
          '2',
          '7',
          '$a V.Council $2 fast $0 http://id.worldcat.org/fast/fst01405122 $1 http://viaf.org/viaf/133636573/ $d 1960 $c San Pietro $t ValueT',
        ];

        const bib611AfterLinkingToAuth111 = [
          15,
          testData.tag611,
          '2',
          '7',
          '$a C380764 Vatican Council $c Basilica di San Pietro in Vaticano) $d 1962-1965 : $n (2nd :',
          '',
          '$0 http://id.loc.gov/authorities/names/n79084169',
          '$2 fast $1 http://viaf.org/viaf/133636573/',
        ];

        const bib611AfterUnlinking = [
          15,
          testData.tag611,
          '2',
          '7',
          '$a C380764 Vatican Council $c Basilica di San Pietro in Vaticano) $d 1962-1965 : $n (2nd : $0 http://id.loc.gov/authorities/names/n79084169 $2 fast $1 http://viaf.org/viaf/133636573/',
        ];

        before('Creating user and data', () => {
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

        after('Deleting created user and data', () => {
          cy.getAdminToken();
          Users.deleteViaApi(testData.userProperties.userId);
          createdRecordIDs.forEach((id, index) => {
            if (index) MarcAuthority.deleteViaAPI(id);
            else InventoryInstance.deleteInstanceViaApi(id);
          });
        });

        it(
          'C380764 Link the "611" of "MARC Bib" field with "111" field of "MARC Authority" record. (spitfire) (TaaS)',
          { tags: ['extendedPath', 'spitfire'] },
          () => {
            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.verifyTagFieldAfterUnlinking(...bib611FieldValues);
            InventoryInstance.verifyAndClickLinkIcon(testData.tag611);
            MarcAuthorities.switchToSearch();
            InventoryInstance.verifySelectMarcAuthorityModal();
            InventoryInstance.verifySearchOptions();
            MarcAuthorities.checkSearchInput(
              'keyword exactPhrase V.Council 1960 ValueT or identifiers.value exactPhrase fst01405122',
            );
            MarcAuthorities.verifyEmptyAuthorityField();
            MarcAuthorities.closeAuthorityLinkingModal();

            QuickMarcEditor.updateExistingField(
              testData.tag611,
              '$a V.Council $2 fast $0 http://id.worldcat.org/fast/fst01405122 $1 http://viaf.org/viaf/133636573/ $c San Pietro $t ValueT',
            );
            InventoryInstance.verifyAndClickLinkIcon(testData.tag611);
            MarcAuthorities.switchToSearch();
            InventoryInstance.verifySelectMarcAuthorityModal();
            InventoryInstance.verifySearchOptions();
            MarcAuthorities.checkSearchInput(
              'keyword exactPhrase V.Council ValueT or identifiers.value exactPhrase fst01405122',
            );
            MarcAuthorities.verifyEmptyAuthorityField();
            MarcAuthorities.closeAuthorityLinkingModal();

            QuickMarcEditor.updateExistingField(
              testData.tag611,
              '$2 fast $0 http://id.worldcat.org/fast/fst01405122 $1 http://viaf.org/viaf/133636573/ $c San Pietro $t ValueT',
            );
            InventoryInstance.verifyAndClickLinkIcon(testData.tag611);
            MarcAuthorities.switchToSearch();
            InventoryInstance.verifySelectMarcAuthorityModal();
            InventoryInstance.verifySearchOptions();
            MarcAuthorities.checkSearchInput(
              'keyword exactPhrase ValueT or identifiers.value exactPhrase fst01405122',
            );
            MarcAuthorities.verifyEmptyAuthorityField();

            MarcAuthorities.switchToBrowse();
            MarcAuthorities.verifyDisabledSearchButton();
            MarcAuthorityBrowse.searchBy(
              testData.searchOptionCorporateName,
              testData.authorityValue,
            );
            MarcAuthorities.checkRow(testData.authorityValue);
            MarcAuthorities.selectTitle(testData.authorityValue);
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingUsingRowIndex(testData.tag611, bib611FieldValues[0]);
            QuickMarcEditor.verifyTagFieldAfterLinking(...bib611AfterLinkingToAuth111);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();

            InventoryInstance.verifyRecordAndMarcAuthIcon(
              testData.accordion,
              `${testData.linkedIconText}\n${testData.authorityHeading}`,
            );
            InventoryInstance.clickViewAuthorityIconDisplayedInInstanceDetailsPane(
              testData.accordion,
            );
            MarcAuthorities.checkDetailViewIncludesText(testData.authorityValue);
            InventoryInstance.goToPreviousPage();
            // Wait for the content to be loaded.
            cy.wait(6000);
            InventoryInstance.waitLoading();
            InventoryInstance.viewSource();
            InventoryViewSource.contains(`${testData.linkedIconText}\n\t611`);
            InventoryInstance.checkExistanceOfAuthorityIconInMarcViewPane();
            InventoryInstance.clickViewAuthorityIconDisplayedInMarcViewPane();
            MarcAuthorities.checkDetailViewIncludesText(testData.authorityValue);
            InventoryInstance.goToPreviousPage();
            // Wait for the content to be loaded.
            cy.wait(6000);
            InventoryViewSource.waitLoading();
            InventoryViewSource.close();
            InventoryInstance.waitLoading();
            InstanceRecordView.verifyInstancePaneExists();
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.verifyTagFieldAfterLinking(...bib611AfterLinkingToAuth111);

            QuickMarcEditor.clickUnlinkIconInTagField(bib611FieldValues[0]);
            QuickMarcEditor.confirmUnlinkingField();
            QuickMarcEditor.verifyTagFieldAfterUnlinking(...bib611AfterUnlinking);
            QuickMarcEditor.verifyIconsAfterUnlinking(bib611FieldValues[0]);
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
