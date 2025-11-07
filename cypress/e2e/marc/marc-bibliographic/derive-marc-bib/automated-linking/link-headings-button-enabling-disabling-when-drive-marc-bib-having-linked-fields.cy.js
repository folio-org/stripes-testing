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
    describe('Edit MARC bib', () => {
      describe('Automated linking', () => {
        const testData = {
          tag700: '700',
          tag337: '337',
          ta337content: '$a video $b v $2 rdamedia $0 n93885611',
          tag130seventhBoxContent: '$0 n93885611',
          tag700content: '$a Roberts, Julia, $d 1967- $e Actor. $0 n91074080333',
          newTag700content: '$a Roberts, Julia, $d 1967- $e Actor. $0 n93885613',
          createdRecordIDs: [],
          errorCalloutMessage: 'Field 700 must be set manually by selecting the link icon.',
          successCalloutMessage: 'Field 700 has been linked to MARC authority record(s).',
          bib130AfterLinkingToAuth100: [
            16,
            '130',
            '0',
            '\\',
            '$a C388561 Runaway Bride (Motion picture)',
            '',
            '$0 http://id.loc.gov/authorities/names/n93885611',
            '$0 n93885611',
          ],
          bib700AfterLinkingToAuth100: [
            55,
            '700',
            '1',
            '\\',
            '$a C388561 Roberts, Julia, $d 1967-',
            '$e Actor.',
            '$0 http://id.loc.gov/authorities/names/n93885613',
            '',
          ],
          bib700_1AfterLinkingToAuth100: [
            56,
            '700',
            '1',
            '\\',
            '$a C388561 Gere, Richard, $d 1949-',
            '$e Actor.',
            '$0 http://id.loc.gov/authorities/names/n93885612',
            '',
          ],
          bib700AfterUnlinking: [
            56,
            '700',
            '1',
            '\\',
            '$a C388561 Gere, Richard, $d 1949- $e Actor. $0 http://id.loc.gov/authorities/names/n93885612',
          ],
        };

        const marcFiles = [
          {
            marc: 'marcBibFileForC388561.mrc',
            fileName: `C388561 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            numOfRecords: 1,
            propertyName: 'instance',
          },
          {
            marc: 'marcAuthFileForC388561_1.mrc',
            fileName: `C388561 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
          {
            marc: 'marcAuthFileForC388561_2.mrc',
            fileName: `C388561 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
          {
            marc: 'marcAuthFileForC388561_3.mrc',
            fileName: `C388561 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
        ];
        const linkingTagAndValues = [
          {
            rowIndex: 16,
            value: 'C388561 Runaway Bride (Motion picture)',
            tag: 130,
          },
          {
            rowIndex: 56,
            value: 'C388561 Gere, Richard',
            tag: 700,
          },
        ];

        before('Creating user and data', () => {
          cy.getAdminToken();
          // make sure there are no duplicate authority records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C388561*');

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ]).then((userProperties) => {
            testData.user = userProperties;

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
            cy.loginAsAdmin();
            cy.visit(TopMenu.inventoryPath).then(() => {
              InventoryInstances.searchByTitle(testData.createdRecordIDs[0]);
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

            cy.waitForAuthRefresh(() => {
              cy.login(testData.user.username, testData.user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
            }, 20_000);
          });
        });

        after('Deleting user, data', () => {
          cy.getAdminToken();
          Users.deleteViaApi(testData.user.userId);
          testData.createdRecordIDs.forEach((id, index) => {
            if (index) MarcAuthority.deleteViaAPI(id);
            else InventoryInstance.deleteInstanceViaApi(id);
          });
        });

        it(
          'C388561 "Link headings" button enabling/disabling when derive "MARC bib" having linked fields (spitfire) (TaaS)',
          { tags: ['extendedPath', 'spitfire', 'C388561'] },
          () => {
            InventoryInstances.searchByTitle(testData.createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.deriveNewMarcBibRecord();
            cy.wait(1500);
            QuickMarcEditor.clickKeepLinkingButton();
            QuickMarcEditor.verifyDisabledLinkHeadingsButton();

            QuickMarcEditor.updateExistingField(testData.tag337, testData.ta337content);
            QuickMarcEditor.checkContent(testData.ta337content, 21);
            QuickMarcEditor.verifyDisabledLinkHeadingsButton();
            QuickMarcEditor.fillLinkedFieldBox(16, 7, testData.tag130seventhBoxContent);
            QuickMarcEditor.verifyTagFieldAfterLinking(...testData.bib130AfterLinkingToAuth100);
            QuickMarcEditor.verifyDisabledLinkHeadingsButton();

            QuickMarcEditor.clickUnlinkIconInTagField(56);
            QuickMarcEditor.confirmUnlinkingField();
            QuickMarcEditor.verifyTagFieldAfterUnlinking(...testData.bib700AfterUnlinking);
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();

            QuickMarcEditor.clickLinkHeadingsButton();
            QuickMarcEditor.checkCallout(testData.successCalloutMessage);
            QuickMarcEditor.verifyDisabledLinkHeadingsButton();
            QuickMarcEditor.verifyTagFieldAfterLinking(...testData.bib700_1AfterLinkingToAuth100);

            QuickMarcEditor.updateExistingFieldContent(55, testData.tag700content);
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();

            QuickMarcEditor.deleteField(55);
            QuickMarcEditor.afterDeleteNotification(testData.tag700);
            QuickMarcEditor.verifyDisabledLinkHeadingsButton();
            QuickMarcEditor.undoDelete();
            QuickMarcEditor.verifyTagValue(55, testData.tag700);
            QuickMarcEditor.checkContent(testData.tag700content, 55);
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();

            QuickMarcEditor.clickLinkHeadingsButton();
            QuickMarcEditor.checkCallout(testData.errorCalloutMessage);
            QuickMarcEditor.closeCallout();
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();

            QuickMarcEditor.updateExistingFieldContent(55, testData.newTag700content);
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();
            QuickMarcEditor.clickLinkHeadingsButton();
            QuickMarcEditor.checkCallout(testData.successCalloutMessage);
            QuickMarcEditor.verifyDisabledLinkHeadingsButton();
            QuickMarcEditor.verifyTagFieldAfterLinking(...testData.bib700AfterLinkingToAuth100);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.verifyAfterDerivedMarcBibSave();
            cy.wait(3000);
            InventoryInstance.viewSource();
            [16, 55, 56].forEach((index) => {
              InventoryViewSource.verifyLinkedToAuthorityIcon(index - 2, true);
            });
          },
        );
      });
    });
  });
});
