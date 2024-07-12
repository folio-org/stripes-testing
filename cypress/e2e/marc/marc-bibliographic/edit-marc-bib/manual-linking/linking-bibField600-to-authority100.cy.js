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
          tag600: '600',
          linkedIconText: 'Linked to MARC authority',
          subjectValue:
            'C377026Black Panther (Fictitious character) Wakanda Forever--TestV--TestX--TestY--TestZ',
        };

        const marcFiles = [
          {
            marc: 'marcBibFileForC377026.mrc',
            fileName: `testMarcFileC377026${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            propertyName: 'instance',
          },
          {
            marc: 'marcAuthFileForC377026.mrc',
            fileName: `testMarcFile377026.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            authorityHeading: 'C377026Black Panther (Fictitious character) Wakanda Forever',
            propertyName: 'authority',
          },
        ];

        const createdRecordIDs = [];

        const bib600FieldValues = [
          45,
          testData.tag600,
          '0',
          '0',
          '$a Black Panther $c (Fictitious character) $4 .prt $2 test $i comics $v TestV $x TestX $y TestY $z TestZ',
        ];

        const bib600AfterLinkingToAuth100 = [
          45,
          testData.tag600,
          '0',
          '0',
          '$a C377026Black Panther $c (Fictitious character) $t Wakanda Forever',
          '$i comics $v TestV $x TestX $y TestY $z TestZ',
          '$0 http://id.loc.gov/authorities/names/n2016004081',
          '$4 .prt $2 test',
        ];

        before('Creating user and data', () => {
          cy.getAdminToken();
          // make sure there are no duplicate authority records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C377026*');

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
                response.forEach((record) => {
                  createdRecordIDs.push(record[marcFile.propertyName].id);
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
          'C377026 Link the "600" of "MARC Bib" field to "MARC Authority" record (with "v", "x", "y", "z" subfields). (spitfire) (TaaS)',
          { tags: ['extendedPath', 'spitfire'] },
          () => {
            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.verifyTagFieldAfterUnlinking(...bib600FieldValues);
            InventoryInstance.verifyAndClickLinkIcon(testData.tag600);
            MarcAuthorities.switchToSearch();
            InventoryInstance.verifySelectMarcAuthorityModal();
            InventoryInstance.searchResults(marcFiles[1].authorityHeading);
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag600);
            QuickMarcEditor.verifyTagFieldAfterLinking(...bib600AfterLinkingToAuth100);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
            InventoryInstance.waitInventoryLoading();
            InventoryInstance.verifyInstanceSubject(
              0,
              0,
              `${testData.linkedIconText}${testData.subjectValue}`,
            );
          },
        );
      });
    });
  });
});
