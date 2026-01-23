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
          tags: {
            tag245: '245',
            tag650: '650',
          },
          fieldContents: {
            tag245Content: 'updated 245',
            tag650Content: '$a Oratory. $2 fast $0 sh85095299C389476',
          },
        };

        const marcFiles = [
          {
            marc: 'marcBibFileForC389476.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            numOfRecords: 1,
            propertyName: 'instance',
          },
          {
            marc: 'marcAuthFileForC389476-1.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
          {
            marc: 'marcAuthFileForC389476-2.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
        ];

        let userData = {};
        const linkableField = 650;
        const createdRecordIDs = [];

        before(() => {
          cy.getAdminToken();
          // make sure there are no duplicate authority records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C389476*');

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
            userData = createdUserProperties;

            QuickMarcEditor.setRulesForField(linkableField, true);

            cy.login(userData.username, userData.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });

        after('Deleting created users, Instances', () => {
          cy.getAdminToken();
          Users.deleteViaApi(userData.userId);
          InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
          createdRecordIDs.forEach((id, index) => {
            if (index) {
              MarcAuthority.deleteViaAPI(id);
            }
          });
        });

        it(
          'C389476 Auto-linking fields when multiple valid for linking "MARC authority" records match "$0" when editing "MARC Bib" record (spitfire) (TaaS)',
          { tags: ['extendedPath', 'spitfire', 'C389476'] },
          () => {
            // 1 Find and open detail view of record from precondition
            InventoryInstances.waitContentLoading();
            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            // 2 Click on "Actions" button in the third pane → Select "Edit MARC bibliographic record" option
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();
            // 3 Click on the "Link headings" button in the upper right corner of page
            QuickMarcEditor.clickLinkHeadingsButton();
            // Linkable field with "$0" subfield matching to "naturalId" field of existing "MARC authority" record was NOT linked, ex.: "650" field
            QuickMarcEditor.verifyTagFieldNotLinked(
              15,
              testData.tags.tag650,
              '\\',
              '7',
              testData.fieldContents.tag650Content,
            );
            // Error toast notification is displayed with following message, e.g.: "Field 650 must be set manually by selecting the link icon. There are multiple authority records that can be matched to this bibliographic field."
            QuickMarcEditor.checkCallout(
              'Field 650 must be set manually by selecting the link icon. There are multiple authority records that can be matched to this bibliographic field.',
            );
            // Enabled "Link headings" button is displayed in the upper right-hand corner of pane header
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();
            // 4 Update value in any field, ex.: update subfield "$a" value in "245" field
            QuickMarcEditor.updateExistingField(
              testData.tags.tag245,
              `$a ${testData.fieldContents.tag245Content}`,
            );
            // 5 Click "Save & close" button
            QuickMarcEditor.pressSaveAndClose();
            cy.wait(1500);
            QuickMarcEditor.checkAfterSaveAndClose();
            // 6 Click on the "Actions" in the third pane → Select "View source" option
            // Source view of edited record is opened in a new pane
            InventoryInstance.viewSource();
            // None of the fields have "MARC authority" app icon displayed next to them
            for (let i = 4; i < 18; i++) {
              InventoryViewSource.verifyLinkedToAuthorityIcon(i, false);
            }
            // Updates made at Step 4 are applied (e.g., updated "$a" value shown in "245" field)
            InventoryViewSource.contains(testData.fieldContents.tag245Content);
          },
        );
      });
    });
  });
});
