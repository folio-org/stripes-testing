import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../support/constants';
import { Permissions } from '../../../../../support/dictionary';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import InstanceRecordView from '../../../../../support/fragments/inventory/instanceRecordView';
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
      describe('Manual linking', () => {
        const testData = {
          tag130: '130',
          authorityMarkedValue: 'C692103 Bible. Polish. Biblia Płocka 1992',
          authorityMarcValue: 'C692103 Bible. $l Polish. $s Biblia Płocka $d 1992',
          linkedIconText: 'Linked to MARC authority',
          accordion: 'Title data',
        };

        const marcFiles = [
          {
            marc: 'marcBibFileC692103.mrc',
            fileName: `testMarcBibFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            propertyName: 'instance',
          },
          {
            marc: 'marcAuthFileC692103.mrc',
            fileName: `testMarcAuthorityFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            authorityHeading: 'C692103 Bible. Polish. Biblia Płocka 1992',
            authority130FieldValue: 'n92085235',
            propertyName: 'authority',
          },
        ];

        const createdRecordIDs = [];

        const bib130InitialFieldValues = [
          16,
          testData.tag130,
          '0',
          '\\',
          '$a Holy Bible $l English. $s English Standard. $f 2016.',
        ];

        const bib130LinkedFieldValues = [
          16,
          testData.tag130,
          '0',
          '\\',
          '$a C692103 Bible. $l Polish. $s Biblia Płocka $d 1992',
          '',
          '$0 http://id.loc.gov/authorities/names/n92085235',
          '',
        ];

        const bib130UnlinkedFieldValues = [
          16,
          testData.tag130,
          '0',
          '\\',
          '$a C692103 Bible. $l Polish. $s Biblia Płocka $d 1992 $0 http://id.loc.gov/authorities/names/n92085235',
        ];

        before('Creating user and data', () => {
          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C692103*');

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ]).then((user) => {
            testData.user = user;

            marcFiles.forEach((file) => {
              DataImport.uploadFileViaApi(file.marc, file.fileName, file.jobProfileToRun).then(
                (response) => {
                  response.forEach((record) => {
                    createdRecordIDs.push(record[file.propertyName].id);
                  });
                },
              );
            });

            cy.waitForAuthRefresh(() => {
              cy.login(user.username, user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
              cy.reload();
              InventoryInstances.waitContentLoading();
            }, 20_000);
          });
        });

        after('Clean up', () => {
          cy.getAdminToken(() => {
            Users.deleteViaApi(testData.user.userId);
          });
          createdRecordIDs.forEach((id, i) => {
            if (i === 0) InventoryInstance.deleteInstanceViaApi(id);
            else MarcAuthority.deleteViaAPI(id);
          });
        });

        it(
          'C692103 Link the "130" of "MARC Bib" field with "130" field of "MARC Authority" record (spitfire)',
          { tags: ['extendedPath', 'spitfire', 'C692103'] },
          () => {
            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();

            QuickMarcEditor.verifyTagFieldAfterUnlinking(...bib130InitialFieldValues);
            InventoryInstance.verifyAndClickLinkIcon(testData.tag130);

            MarcAuthorities.switchToSearch();
            InventoryInstance.verifySelectMarcAuthorityModal();
            InventoryInstance.searchResults(marcFiles[1].authorityHeading);
            MarcAuthorities.checkFieldAndContentExistence(
              testData.tag130,
              testData.authorityMarcValue,
            );
            MarcAuthorities.clickLinkButton();

            QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag130);
            QuickMarcEditor.verifyTagFieldAfterLinking(...bib130LinkedFieldValues);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();

            InventoryInstance.verifyAlternativeTitle(
              0,
              1,
              `Linked to MARC authority${testData.authorityMarkedValue}`,
            );
            InventoryInstance.checkExistanceOfAuthorityIconInInstanceDetailPane(testData.accordion);
            InventoryInstance.clickViewAuthorityIconDisplayedInInstanceDetailsPane(
              testData.accordion,
            );
            InventoryInstance.goToPreviousPage();
            InventoryInstance.waitInventoryLoading();

            InventoryInstance.viewSource();
            InventoryInstance.checkExistanceOfAuthorityIconInMarcViewPane();
            InventoryInstance.clickViewAuthorityIconDisplayedInMarcViewPane();
            MarcAuthorities.checkDetailViewIncludesText(testData.authorityMarkedValue);
            InventoryInstance.goToPreviousPage();

            InventoryViewSource.waitLoading();
            InventoryViewSource.close();
            InstanceRecordView.verifyInstancePaneExists();

            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.verifyTagFieldAfterLinking(...bib130LinkedFieldValues);
            QuickMarcEditor.clickUnlinkIconInTagField(bib130UnlinkedFieldValues[0]);
            QuickMarcEditor.confirmUnlinkingField();
            QuickMarcEditor.verifyTagFieldAfterUnlinking(...bib130UnlinkedFieldValues);
            QuickMarcEditor.verifyIconsAfterUnlinking(bib130UnlinkedFieldValues[0]);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();

            InventoryInstance.checkAbsenceOfAuthorityIconInInstanceDetailPane(testData.accordion);
            InventoryInstance.viewSource();
            InventoryInstance.checkAbsenceOfAuthorityIconInMarcViewPane();
          },
        );
      });
    });
  });
});
