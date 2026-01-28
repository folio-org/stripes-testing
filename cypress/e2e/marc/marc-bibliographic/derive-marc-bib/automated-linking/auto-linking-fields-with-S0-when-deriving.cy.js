import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../support/constants';
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

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      describe('Automated linking', () => {
        const testData = {
          instanceTitle:
            'C388638 Runaway bride/ produced by Robert W. Cort, Ted Field, Scott Kroopf, Tom Rosenberg; written by Josann McGibbon, Sara Parriott; directed by Garry Marshall.',
          createdRecordIDs: [],
          tag130content: [
            16,
            '130',
            '0',
            '\\',
            '$a C388638 Runaway Bride (Motion picture)',
            '',
            '$0 http://id.loc.gov/authorities/names/n2002076264',
            '',
          ],
          fieldContents: {
            tag245Content: 'New title',
          },
          field130: {
            tag130: '130',
            rowIndex: 16,
            content: '$a C388638 Runaway Bride (Motion picture)',
          },
          field240: {
            tag240: '240',
            rowIndex: 17,
            constnet: '$a Value240 $0 n99036055',
          },
          field600: {
            tag600: '600',
            rowIndex: 38,
            content: '$a Value600 $0 y021021',
          },
          field650: {
            tag650: '650',
            rowIndex: 40,
            content: '$a Man-woman relationships $v Drama. $0 sh85095291',
          },
          field711: {
            tag711: '711',
            content: '$a Value711 $0 y021022',
          },
          field830: {
            tag830: '830',
            content: '$a Value830',
          },
          successCalloutMessage: 'Field 240 and 650 has been linked to MARC authority record(s).',
          errorCalloutMessage: 'Field 600 and 711 must be set manually by selecting the link icon.',
        };

        const linkableFields = [240, 600, 650, 711, 830];

        const marcFiles = [
          {
            marc: 'marcBibFileForC388638.mrc',
            fileName: `C388638 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            numOfRecords: 1,
            propertyName: 'instance',
          },
          {
            marc: 'marcAuthFileForC388638_1.mrc',
            fileName: `C388638_1 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
            authorityHeading: 'C388638 Runaway Bride (Motion picture)',
          },
          {
            marc: 'marcAuthFileForC388638_2.mrc',
            fileName: `C388638_2 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            propertyName: 'authority',
            numOfRecords: 1,
          },
          {
            marc: 'marcAuthFileForC388638_3.mrc',
            fileName: `C388638_3 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            propertyName: 'authority',
            numOfRecords: 1,
          },
          {
            marc: 'marcAuthFileForC388638_4.mrc',
            fileName: `C388638_4 testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            propertyName: 'authority',
            numOfRecords: 1,
          },
          {
            marc: 'marcAuthFileForC388638_5.mrc',
            fileName: `C388638_5 testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            propertyName: 'authority',
            numOfRecords: 1,
          },
        ];

        before('Create test data', () => {
          cy.getAdminToken();
          // make sure there are no duplicate authority records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C388638*');

          marcFiles.forEach((marcFile) => {
            DataImport.uploadFileViaApi(
              marcFile.marc,
              marcFile.fileName,
              marcFile.jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                testData.createdRecordIDs.push(record[marcFile.propertyName].id);
              });
            });
          });

          linkableFields.forEach((tag) => {
            QuickMarcEditor.setRulesForField(tag, true);
          });

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ]).then((createdUserProperties) => {
            testData.user = createdUserProperties;

            cy.loginAsAdmin({
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
              authRefresh: true,
            });
            InventoryInstances.searchByTitle(testData.createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            InventoryInstance.verifyAndClickLinkIconByIndex(testData.field130.rowIndex);
            MarcAuthorities.switchToSearch();
            InventoryInstance.verifySelectMarcAuthorityModal();
            InventoryInstance.searchResults(marcFiles[1].authorityHeading);
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingAuthority(testData.field130.tag130);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();

            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
              authRefresh: true,
            });
          });
        });

        after('Deleting created users, Instances', () => {
          cy.getAdminToken();
          Users.deleteViaApi(testData.user.userId);
          InventoryInstance.deleteInstanceViaApi(testData.createdRecordIDs[0]);
          testData.createdRecordIDs.forEach((id, index) => {
            if (index) MarcAuthority.deleteViaAPI(id);
          });
        });

        it(
          'C388638 Auto-linking fields having "$0" when deriving new "MARC Bib" record (spitfire) (TaaS)',
          { tags: ['extendedPath', 'spitfire', 'C388638'] },
          () => {
            InventoryInstances.searchByTitle(testData.createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.deriveNewMarcBib();
            QuickMarcEditor.clickKeepLinkingButton();
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();
            QuickMarcEditor.updateExistingField(
              testData.field240.tag240,
              testData.field240.constnet,
            );
            QuickMarcEditor.updateExistingField(
              testData.field600.tag600,
              testData.field600.content,
            );
            QuickMarcEditor.updateExistingField(
              testData.field650.tag650,
              testData.field650.content,
            );
            QuickMarcEditor.updateExistingField(
              testData.field711.tag711,
              testData.field711.content,
            );
            QuickMarcEditor.updateExistingField(
              testData.field830.tag830,
              testData.field830.content,
            );
            QuickMarcEditor.clickLinkHeadingsButton();
            cy.wait(1000);
            QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(testData.field240.rowIndex);
            QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(testData.field650.rowIndex);
            QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(testData.field130.rowIndex);
            QuickMarcEditor.verifyTagFieldAfterLinking(...testData.tag130content);
            QuickMarcEditor.checkCallout(testData.successCalloutMessage);
            QuickMarcEditor.checkCallout(testData.errorCalloutMessage);
            QuickMarcEditor.closeCallout();
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();
            QuickMarcEditor.pressSaveAndCloseButton();
            QuickMarcEditor.checkAfterSaveAndCloseDerive();
            InventoryInstance.checkInstanceTitle(testData.instanceTitle);
            InventoryInstance.viewSource();
            [
              testData.field130.rowIndex,
              testData.field240.rowIndex,
              testData.field650.rowIndex,
            ].forEach((index) => {
              InventoryViewSource.verifyLinkedToAuthorityIcon(index - 2, true);
            });
          },
        );
      });
    });
  });
});
