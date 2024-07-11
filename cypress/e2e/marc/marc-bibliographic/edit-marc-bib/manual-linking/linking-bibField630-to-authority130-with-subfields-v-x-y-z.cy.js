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
          tag630: '630',
          subjectAccordion: 'Subject',
          subjectValue: 'C377028  Marvel comics ComiCon--TestV--TestX--TestY--TestZ',
          authorityIconText: 'Linked to MARC authority',
        };

        const marcFiles = [
          {
            marc: 'marcBibFileForC377028.mrc',
            fileName: `testMarcFileC377028${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            propertyName: 'instance',
          },
          {
            marc: 'marcAuthFileForC377028.mrc',
            fileName: `testMarcFileC377028${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            authorityHeading: 'C377028 Marvel comics ComiCon',
            propertyName: 'authority',
          },
        ];

        const createdRecordIDs = [];

        const bib630AfterLinkingToAuth130 = [
          22,
          testData.tag630,
          '0',
          '7',
          '$a C377028  Marvel comics $t ComiCon',
          '$w 830 $v TestV $x TestX $y TestY $z TestZ',
          '$0 80026955',
          '$2 fast',
        ];

        before('Creating user and data', () => {
          cy.getAdminToken();
          // make sure there are no duplicate authority records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C377028*');

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
          cy.getAdminToken().then(() => {
            Users.deleteViaApi(testData.userProperties.userId);
            createdRecordIDs.forEach((id, index) => {
              if (index) MarcAuthority.deleteViaAPI(id);
              else InventoryInstance.deleteInstanceViaApi(id);
            });
          });
        });

        it(
          'C377028 Link the "630" of "MARC Bib" field to "MARC Authority" record (with "v", "x", "y", "z" subfields). (spitfire) (TaaS)',
          { tags: ['extendedPath', 'spitfire'] },
          () => {
            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            InventoryInstance.verifyAndClickLinkIcon(testData.tag630);
            InventoryInstance.verifySelectMarcAuthorityModal();
            InventoryInstance.verifySearchOptions();
            MarcAuthorities.switchToSearch();
            MarcAuthorities.clickReset();
            InventoryInstance.searchResults(marcFiles[1].authorityHeading);
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag630);
            QuickMarcEditor.checkUnlinkTooltipText(22, 'Unlink from MARC Authority record');
            QuickMarcEditor.checkViewMarcAuthorityTooltipText(bib630AfterLinkingToAuth130[0]);
            QuickMarcEditor.verifyTagFieldAfterLinking(...bib630AfterLinkingToAuth130);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
            InventoryInstance.verifyInstanceSubject(
              2,
              0,
              `${testData.authorityIconText}${testData.subjectValue}`,
            );
            InventoryInstance.checkExistanceOfAuthorityIconInInstanceDetailPane(
              testData.subjectAccordion,
            );
          },
        );
      });
    });
  });
});
