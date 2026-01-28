import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../support/constants';
import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
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
            rowIndex: 22,
            tag: '337',
            naturalId: '$0 n91074080C387524',
          },
          {
            rowIndex: 56,
            tag: '700',
            notMatchingNaturalId: '$0 n9107408099C387524',
            matchingNaturalId: '$0 n91074080C387524',
            emptyContent: '',
            fourthBox: '$a C387524 Roberts, Julia, $d 1967-',
            fifthBox: '$e Actor.',
            sixthBox: '$0 http://id.loc.gov/authorities/names/n91074080C387524',
            seventhBox: '',
            valueAfterSave: 'C387524 Roberts, Julia, 1967-',
          },
        ];

        let userData = {};

        const marcFiles = [
          {
            marc: 'marcBibFileForC387524.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            numOfRecords: 1,
            propertyName: 'instance',
          },
          {
            marc: 'marcAuthFileForC387524.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
        ];

        const createdAuthorityIDs = [];

        before(() => {
          cy.getAdminToken();
          // make sure there are no duplicate authority records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C387524*');

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

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          ]).then((createdUserProperties) => {
            userData = createdUserProperties;
            cy.waitForAuthRefresh(() => {
              cy.login(userData.username, userData.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
              cy.reload();
              InventoryInstances.waitContentLoading();
            }, 20_000);
          });
        });

        after('Deleting created users, Instances', () => {
          cy.getAdminToken();
          Users.deleteViaApi(userData.userId);
          InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[0]);
          MarcAuthority.deleteViaAPI(createdAuthorityIDs[1]);
        });

        it(
          'C387524 "Link headings" button enabling/disabling when edit "MARC bib" (spitfire)',
          { tags: ['criticalPath', 'spitfire', 'C387524'] },
          () => {
            InventoryInstances.searchByTitle(createdAuthorityIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.verifyDisabledLinkHeadingsButton();
            QuickMarcEditor.updateExistingFieldContent(
              fieldsToUpdate[0].rowIndex,
              fieldsToUpdate[0].naturalId,
            );
            QuickMarcEditor.verifyDisabledLinkHeadingsButton();
            QuickMarcEditor.updateExistingFieldContent(
              fieldsToUpdate[1].rowIndex,
              `${fieldsToUpdate[1].fourthBox} ${fieldsToUpdate[1].fifthBox} ${fieldsToUpdate[1].notMatchingNaturalId}`,
            );
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();
            QuickMarcEditor.clickLinkHeadingsButton();
            QuickMarcEditor.checkCallout(
              'Field 700 must be set manually by selecting the link icon.',
            );
            QuickMarcEditor.updateExistingFieldContent(
              fieldsToUpdate[1].rowIndex,
              fieldsToUpdate[1].emptyContent,
            );
            QuickMarcEditor.verifyDisabledLinkHeadingsButton();
            QuickMarcEditor.updateExistingFieldContent(
              fieldsToUpdate[1].rowIndex,
              `${fieldsToUpdate[1].fourthBox} ${fieldsToUpdate[1].fifthBox} ${fieldsToUpdate[1].matchingNaturalId}`,
            );
            QuickMarcEditor.clickLinkHeadingsButton();
            QuickMarcEditor.verifyDisabledLinkHeadingsButton();
            QuickMarcEditor.verifyTagFieldAfterLinking(
              fieldsToUpdate[1].rowIndex,
              fieldsToUpdate[1].tag,
              '1',
              '\\',
              fieldsToUpdate[1].fourthBox,
              fieldsToUpdate[1].fifthBox,
              fieldsToUpdate[1].sixthBox,
              fieldsToUpdate[1].seventhBox,
            );
            QuickMarcEditor.deleteField(fieldsToUpdate[1].rowIndex);
            QuickMarcEditor.afterDeleteNotification(fieldsToUpdate[1].tag);
            QuickMarcEditor.verifyDisabledLinkHeadingsButton();
            QuickMarcEditor.pressSaveAndCloseButton();
            cy.wait(4000);
            QuickMarcEditor.clickRestoreDeletedField();
            QuickMarcEditor.checkNoDeletePlaceholder();
            QuickMarcEditor.verifyDisabledLinkHeadingsButton();
            QuickMarcEditor.clickUnlinkIconInTagField(fieldsToUpdate[1].rowIndex);
            QuickMarcEditor.confirmUnlinkingField();
            QuickMarcEditor.verifyTagFieldAfterUnlinking(
              fieldsToUpdate[1].rowIndex,
              fieldsToUpdate[1].tag,
              '1',
              '\\',
              '$a C387524 Roberts, Julia, $d 1967- $e Actor. $0 n91074080C387524',
            );
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();
            QuickMarcEditor.updateExistingFieldContent(
              fieldsToUpdate[1].rowIndex,
              '$a C387524 Roberts, Julia, $d 1967- $e Actor.',
            );
            QuickMarcEditor.verifyDisabledLinkHeadingsButton();
            QuickMarcEditor.updateExistingFieldContent(
              fieldsToUpdate[1].rowIndex,
              '$a C387524 Roberts, Julia, $d 1967- $e Actor. $0 http://id.loc.gov/authorities/names/n91074080C387524',
            );
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();
            QuickMarcEditor.updateExistingTagValue(fieldsToUpdate[1].rowIndex, '701');
            QuickMarcEditor.verifyDisabledLinkHeadingsButton();
            QuickMarcEditor.updateExistingTagValue(fieldsToUpdate[1].rowIndex, '700');
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();
            QuickMarcEditor.clickLinkHeadingsButton();
            QuickMarcEditor.verifyDisabledLinkHeadingsButton();
            QuickMarcEditor.verifyTagFieldAfterLinking(
              fieldsToUpdate[1].rowIndex,
              fieldsToUpdate[1].tag,
              '1',
              '\\',
              fieldsToUpdate[1].fourthBox,
              fieldsToUpdate[1].fifthBox,
              fieldsToUpdate[1].sixthBox,
              fieldsToUpdate[1].seventhBox,
            );
            QuickMarcEditor.pressSaveAndClose();
            cy.wait(4000);
            QuickMarcEditor.checkAfterSaveAndClose();
            InventoryInstance.verifyRecordAndMarcAuthIcon(
              'Contributor',
              `Linked to MARC authority\n${fieldsToUpdate[1].valueAfterSave}`,
            );
          },
        );
      });
    });
  });
});
