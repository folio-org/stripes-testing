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
          createdRecordIDs: [],
          instanceTitle:
            'Black Panther (Test: with all eligible for linking fields with and without valid subfield 0)',
          calloutMessage:
            'Field 100, 610, 700, and 800 has been linked to MARC authority record(s).',
        };

        const marcFiles = [
          {
            marc: 'marcBibFileForC388518.mrc',
            fileName: `C388518 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            numOfRecords: 1,
            propertyName: 'instance',
          },
          {
            marc: 'marcAuthFileForC388518.mrc',
            fileName: `C388518 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 9,
            propertyName: 'authority',
          },
        ];

        const linkableFields = [
          100, 110, 111, 130, 240, 600, 610, 611, 630, 650, 651, 655, 700, 710, 711, 730, 800, 810,
          811, 830,
        ];
        const linkedFieldIndexes = [32, 55, 77, 78, 79, 80, 81, 82, 83];
        const linkedFieldIndexesAfterDeleting = [32, 55, 77, 78, 79, 80];

        before('Creating user and data', () => {
          cy.getAdminToken();
          // make sure there are no duplicate authority records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C388518*');

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

          cy.createTempUser([
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ]).then((userProperties) => {
            testData.user = userProperties;

            cy.getAdminToken();
            linkableFields.forEach((tag) => {
              QuickMarcEditor.setRulesForField(tag, true);
            });

            cy.waitForAuthRefresh(() => {
              cy.login(testData.user.username, testData.user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
            }, 20_000);
          });
        });

        after('Deleting created user and data', () => {
          cy.getAdminToken();
          Users.deleteViaApi(testData.user.userId);
          InventoryInstance.deleteInstanceViaApi(testData.createdRecordIDs[0]);
          testData.createdRecordIDs.forEach((id, index) => {
            if (index) MarcAuthority.deleteViaAPI(id, true);
          });
        });

        it(
          'C388518 Delete automatically linked fields when edit "MARC bib" (spitfire) (TaaS)',
          { tags: ['extendedPath', 'spitfire', 'C388518'] },
          () => {
            InventoryInstances.searchByTitle(testData.createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();
            QuickMarcEditor.clickLinkHeadingsButton();
            QuickMarcEditor.checkCallout(testData.calloutMessage);
            linkedFieldIndexes.forEach((index) => {
              QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(index);
            });
            QuickMarcEditor.verifyDisabledLinkHeadingsButton();
            QuickMarcEditor.deleteField(78);
            QuickMarcEditor.afterDeleteNotification(testData.tag700);
            QuickMarcEditor.deleteField(80);
            QuickMarcEditor.afterDeleteNotification(testData.tag700);
            QuickMarcEditor.deleteField(83);
            QuickMarcEditor.clickSaveAndKeepEditingButton();
            cy.wait(4000);
            QuickMarcEditor.confirmDeletingFields();
            // need to wait until fields will be deleted
            cy.wait(1500);
            QuickMarcEditor.closeEditorPane();
            InventoryInstance.checkInstanceTitle(testData.instanceTitle);
            InventoryInstance.viewSource();
            linkedFieldIndexesAfterDeleting.forEach((index) => {
              InventoryViewSource.verifyLinkedToAuthorityIcon(index, true);
            });
          },
        );
      });
    });
  });
});
