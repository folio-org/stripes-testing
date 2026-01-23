import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../support/constants';
import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesSearch from '../../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
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
          createdRecordIDs: [],
          tag100: '111',
          tag240: '240',
          tag240content:
            '$a C380746 Conf on Security & Cooperation in Europe $c H. Finland $0 n88380746',
          filterStateTag111: [
            'advancedSearch',
            'keyword exactPhrase C380746 Conf on Security & Cooperation in Europe or identifiers.value exactPhrase n88380746',
          ],
          markedValue: 'C380746 Conference on Security and Cooperation in Europe',
          authority010FieldValue: 'n  88380746',
          authority111FieldValue: 'C380746 Conference on Security and Cooperation in Europe',
          authorityIconText: 'Linked to MARC authority',
          calloutMessage:
            'This record has successfully saved and is in process. Changes may not appear immediately.',
        };

        const marcFiles = [
          {
            marc: 'marcBibFileC380746.mrc',
            fileName: `C380746 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            numOfRecords: 1,
            instanceAlternativeTitle: 'Final Act (1972-1975 : English',
            propertyName: 'instance',
          },
          {
            marc: 'marcAuthFileC380746.mrc',
            fileName: `C380746 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
        ];
        const bib240AfterLinkingToAuth111 = [
          11,
          testData.tag240,
          '1',
          '\\',
          '$a Final Act $d (1972-1975 : $l English',
          '$c H. Finland',
          '$0 http://id.loc.gov/authorities/names/n88380746',
          '',
        ];
        const bib240AfterUninkingToAuth111 = [
          11,
          testData.tag240,
          '1',
          '\\',
          '$a Final Act $d (1972-1975 : $l English $c H. Finland $0 http://id.loc.gov/authorities/names/n88380746',
        ];

        before('Creating test data', () => {
          cy.getAdminToken();
          // make sure there are no duplicate authority records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C380746');

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ]).then((userProperties) => {
            testData.user = userProperties;

            cy.getAdminToken();
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

            cy.waitForAuthRefresh(() => {
              cy.login(testData.user.username, testData.user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
            }, 20_000);
          });
        });

        after('Deleting test data', () => {
          cy.getAdminToken().then(() => {
            Users.deleteViaApi(testData.user.userId);
            MarcAuthority.deleteViaAPI(testData.createdRecordIDs[1]);
            InventoryInstance.deleteInstanceViaApi(testData.createdRecordIDs[0]);
          });
        });

        it(
          'C380746 Link the "240" of "MARC Bib" field (having $0 without base URL) with "111" field of "MARC Authority" record. (spitfire) (TaaS)',
          { tags: ['extendedPath', 'spitfire', 'C380746'] },
          () => {
            InventoryInstances.searchByTitle(testData.createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.clickLinkIconInTagField(11);
            InventoryInstance.verifySelectMarcAuthorityModal();
            MarcAuthoritiesSearch.verifyFiltersState(
              testData.filterStateTag111[0],
              testData.filterStateTag111[1],
              'Search',
            );
            MarcAuthority.contains(testData.authority010FieldValue);
            MarcAuthority.contains(testData.authority111FieldValue);
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag240);
            QuickMarcEditor.verifyTagFieldAfterLinking(...bib240AfterLinkingToAuth111);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
            InventoryInstance.waitInventoryLoading();
            InventoryInstance.verifyAlternativeTitle(
              0,
              1,
              `${testData.authorityIconText}${marcFiles[0].instanceAlternativeTitle}`,
            );
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.checkFieldsExist([testData.tag240]);
            QuickMarcEditor.clickUnlinkIconInTagField(11);
            QuickMarcEditor.confirmUnlinkingField();
            QuickMarcEditor.verifyTagFieldAfterUnlinking(...bib240AfterUninkingToAuth111);
            QuickMarcEditor.verifyIconsAfterUnlinking(11);
            cy.wait(1500);
            QuickMarcEditor.pressSaveAndKeepEditing(testData.calloutMessage);
            // need to wait until the instance will be updated
            cy.wait(1500);
          },
        );
      });
    });
  });
});
