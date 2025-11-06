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
        const fieldsToUpdate = [
          {
            rowIndex: 21,
            tag: '337',
            content: '$a video $b v $2 rdamedia $0 n91074080C388533',
          },
          {
            rowIndex: 16,
            tag: '130',
            naturalId: '$0 n91074080C388533',
          },
          {
            rowIndex: 55,
            tag: '700',
            content: '$a Roberts, Julia, $d 1967- $e Actor. $0 n91074080C388533',
            emptyContent: '',
            fourthBox: '$a C388533 Roberts, Julia, $d 1967-',
            fifthBox: '$e Actor.',
            sixthBox: '$0 http://id.loc.gov/authorities/names/n91074080C388533',
            seventhBox: '',
          },
        ];

        let userData = {};

        const marcFiles = [
          {
            marc: 'marcBibFileForC388533.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            numOfRecords: 1,
            propertyName: 'instance',
          },
          {
            marc: 'marcAuthFileForC388533.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 3,
            propertyName: 'authority',
          },
        ];

        const linkingTagAndValues = [
          {
            rowIndex: 16,
            value: 'C388533 Runaway Bride (Motion picture)',
            tag: 130,
          },
          {
            rowIndex: 56,
            value: 'C388533 Gere, Richard, 1949-',
            tag: 700,
          },
        ];

        const marcAuthIcon = 'Linked to MARC authority';

        const createdRecordIDs = [];

        before(() => {
          cy.getAdminToken();
          // make sure there are no duplicate authority records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C388533*');

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

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          ]).then((createdUserProperties) => {
            userData = createdUserProperties;

            cy.loginAsAdmin().then(() => {
              cy.visit(TopMenu.inventoryPath);
              InventoryInstances.searchByTitle(createdRecordIDs[0]);
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
              cy.login(userData.username, userData.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
            }, 20_000);
          });
        });

        after('Deleting created users, Instances', () => {
          cy.getAdminToken();
          Users.deleteViaApi(userData.userId);
          createdRecordIDs.forEach((id, index) => {
            if (index) MarcAuthority.deleteViaAPI(id);
            else InventoryInstance.deleteInstanceViaApi(id);
          });
        });

        it(
          'C388533 "Link headings" button enabling/disabling when edit "MARC bib" having linked fields (spitfire) (TaaS)',
          { tags: ['extendedPath', 'spitfire', 'C388533'] },
          () => {
            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.verifyDisabledLinkHeadingsButton();
            QuickMarcEditor.updateExistingFieldContent(
              fieldsToUpdate[0].rowIndex,
              fieldsToUpdate[0].content,
            );
            QuickMarcEditor.verifyDisabledLinkHeadingsButton();
            QuickMarcEditor.fillEmptyTextAreaOfField(
              fieldsToUpdate[1].rowIndex,
              'records[16].subfieldGroups.uncontrolledNumber',
              fieldsToUpdate[1].naturalId,
            );
            QuickMarcEditor.verifyDisabledLinkHeadingsButton();
            QuickMarcEditor.clickUnlinkIconInTagField(linkingTagAndValues[1].rowIndex);
            QuickMarcEditor.confirmUnlinkingField();
            QuickMarcEditor.verifyTagFieldAfterUnlinking(
              linkingTagAndValues[1].rowIndex,
              `${linkingTagAndValues[1].tag}`,
              '1',
              '\\',
              '$a C388533 Gere, Richard, $d 1949- $e Actor. $0 http://id.loc.gov/authorities/names/n86041334C388533',
            );
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();
            QuickMarcEditor.clickLinkHeadingsButton();
            QuickMarcEditor.verifyDisabledLinkHeadingsButton();
            QuickMarcEditor.verifyTagFieldAfterLinking(
              linkingTagAndValues[1].rowIndex,
              `${linkingTagAndValues[1].tag}`,
              '1',
              '\\',
              '$a C388533 Gere, Richard, $d 1949-',
              '$e Actor.',
              '$0 http://id.loc.gov/authorities/names/n86041334C388533',
              '',
            );
            QuickMarcEditor.updateExistingFieldContent(
              fieldsToUpdate[2].rowIndex,
              fieldsToUpdate[2].content,
            );
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();
            QuickMarcEditor.clickLinkHeadingsButton();
            QuickMarcEditor.verifyDisabledLinkHeadingsButton();
            QuickMarcEditor.verifyTagFieldAfterLinking(
              fieldsToUpdate[2].rowIndex,
              fieldsToUpdate[2].tag,
              '1',
              '\\',
              fieldsToUpdate[2].fourthBox,
              fieldsToUpdate[2].fifthBox,
              fieldsToUpdate[2].sixthBox,
              fieldsToUpdate[2].seventhBox,
            );
            QuickMarcEditor.deleteField(fieldsToUpdate[2].rowIndex);
            QuickMarcEditor.afterDeleteNotification('700');
            QuickMarcEditor.verifyDisabledLinkHeadingsButton();
            QuickMarcEditor.pressSaveAndCloseButton();
            QuickMarcEditor.checkDeletingFieldsModal();
            QuickMarcEditor.restoreDeletedFields();
            QuickMarcEditor.verifyTagFieldAfterLinking(
              fieldsToUpdate[2].rowIndex,
              fieldsToUpdate[2].tag,
              '1',
              '\\',
              fieldsToUpdate[2].fourthBox,
              fieldsToUpdate[2].fifthBox,
              fieldsToUpdate[2].sixthBox,
              fieldsToUpdate[2].seventhBox,
            );
            QuickMarcEditor.verifyDisabledLinkHeadingsButton();
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
            InventoryInstance.viewSource();
            InventoryViewSource.contains(
              `${marcAuthIcon}\n\t130\t0  \t$a C388533 Runaway Bride (Motion picture) $0 http://id.loc.gov/authorities/names/n2002076264C388533 $9`,
            );
            InventoryViewSource.contains(
              `${marcAuthIcon}\n\t700\t1  \t$a C388533 Roberts, Julia, $d 1967- $e Actor. $0 http://id.loc.gov/authorities/names/n91074080C388533 $9`,
            );
            InventoryViewSource.contains(
              `${marcAuthIcon}\n\t700\t1  \t$a C388533 Gere, Richard, $d 1949- $e Actor. $0 http://id.loc.gov/authorities/names/n86041334C388533 $9`,
            );
          },
        );
      });
    });
  });
});
