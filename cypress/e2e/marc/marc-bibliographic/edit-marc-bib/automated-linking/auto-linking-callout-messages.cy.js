import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../support/constants';
import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';
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
        const testData = {
          tag100: '100',
          tag100Index: 13,
          tag245: '245',
          tag245Content: 'updated C389478',
        };

        const marcFiles = [
          {
            marc: 'marcBibFileForC389478.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            numOfRecords: 1,
            propertyName: 'instance',
          },
          {
            marc: 'marcAuthFileForC389478-1.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
          {
            marc: 'marcAuthFileForC389478-2.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
          {
            marc: 'marcAuthFileForC389478-3.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
        ];

        const linkableFields = [100, 650, 800];
        const createdRecordIDs = [];

        before(() => {
          cy.getAdminToken();
          // make sure there are no duplicate authority records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C389478*');

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
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ]).then((createdUserProperties) => {
            testData.user = createdUserProperties;

            linkableFields.forEach((tag) => {
              QuickMarcEditor.setRulesForField(tag, true);
            });

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
          InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
          createdRecordIDs.forEach((id, index) => {
            if (index) {
              MarcAuthority.deleteViaAPI(id);
            }
          });
        });

        it(
          'C389478 All three messages shown for one field each when auto-linking  fields when editing "MARC Bib" record (spitfire) (TaaS)',
          { tags: ['extendedPath', 'spitfire', 'C389478'] },
          () => {
            // #1 Find and open detail view of record from precondition
            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            InventoryInstances.selectInstance();

            // #2 Click on "Actions" button in the third pane → Select "Edit MARC bibliographic record" option
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();

            // #3 Click on the "Link headings" button in the upper right corner of page
            QuickMarcEditor.clickLinkHeadingsButton();
            QuickMarcEditor.checkCallout('Field 100 has been linked to MARC authority record(s).');
            QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(testData.tag100Index);
            QuickMarcEditor.checkCallout(
              'Field 650 must be set manually by selecting the link icon.',
            );
            QuickMarcEditor.checkCallout(
              'Field 800 must be set manually by selecting the link icon. There are multiple authority records that can be matched to this bibliographic field.',
            );
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();

            // #4 Update value in any field, e.g.:
            QuickMarcEditor.updateExistingField(testData.tag245, `$a ${testData.tag245Content}`);

            // #5 Click "Save & close" button
            QuickMarcEditor.pressSaveAndCloseButton();
            QuickMarcEditor.checkAfterSaveAndClose();

            // #6 Click on the "Actions" in the third pane → Select "View source" option
            InventoryInstance.viewSource();
            // * Only first linkable field from Preconditions has "MARC authority" app icon displayed next to it (e.g., "100")
            for (let i = 4; i < 29; i++) {
              if (i === testData.tag100Index) {
                InventoryViewSource.verifyLinkedToAuthorityIcon(i, true);
              } else {
                InventoryViewSource.verifyLinkedToAuthorityIcon(i, false);
              }
            }
            // * Updates made at Step 4 are applied (e.g., updated "$a" value shown in "245" field)
            InventoryViewSource.contains(testData.tag245Content);
          },
        );
      });
    });
  });
});
