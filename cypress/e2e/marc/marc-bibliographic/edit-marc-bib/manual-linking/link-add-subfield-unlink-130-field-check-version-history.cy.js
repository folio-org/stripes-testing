import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../support/constants';
import { Permissions } from '../../../../../support/dictionary';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import InstanceRecordView from '../../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';
import VersionHistorySection from '../../../../../support/fragments/inventory/versionHistorySection';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import DateTools from '../../../../../support/utils/dateTools';
import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      describe('Manual linking', () => {
        const testData = {
          tag130: '130',
          accordion: 'Title data',
          date: DateTools.getFormattedDateWithSlashes({ date: new Date() }),
          authorityHeading: 'Bible. Polish. Biblia Płocka 1992',
          ldrRegExp: /^\d{5}[a-zA-Z]{3}.{1}[a-zA-Z0-9]{8}.{3}4500$/,
        };

        const marcFiles = [
          {
            marc: 'marcBibFileC374198.mrc',
            fileName: `testMarcBibC374198.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            propertyName: 'instance',
          },
          {
            marc: 'marcAuthFileC374198.mrc',
            fileName: `testMarcAuthC374198.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
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
          '$a Bible. $l Polish. $s Biblia Płocka $d 1992',
          '',
          '$0 http://id.loc.gov/authorities/names/n92085235',
          '',
        ];

        const bib130WithSubfieldsValues = [
          16,
          testData.tag130,
          '0',
          '\\',
          '$a Bible. $l Polish. $s Biblia Płocka $d 1992',
          '$e author',
          '$0 http://id.loc.gov/authorities/names/n92085235',
          '$3 test',
        ];

        const bib130UnlinkedFieldValues = [
          16,
          testData.tag130,
          '0',
          '\\',
          '$a Bible. $l Polish. $s Biblia Płocka $d 1992 $e author $0 http://id.loc.gov/authorities/names/n92085235 $3 test',
        ];

        before('Create test data', () => {
          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C374198*');

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

            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });

        after('Delete test data', () => {
          cy.getAdminToken(() => {
            Users.deleteViaApi(testData.user.userId);
          });
          createdRecordIDs.forEach((id, i) => {
            if (i === 0) InventoryInstance.deleteInstanceViaApi(id);
            else MarcAuthority.deleteViaAPI(id);
          });
        });

        it(
          'C374198 Link/add not controlled subfield/unlink "130" MARC bib\'s field with "130" field of "MARC authority" record and check "Version history" pane (spitfire)',
          { tags: ['extendedPath', 'spitfire', 'C374198'] },
          () => {
            const changesModalDataCard0 = [
              {
                action: VersionHistorySection.fieldActions.EDITED,
                field: '130',
                from: `0  $a Bible. $l Polish. $s Biblia Płocka $d 1992 $e author $0 http://id.loc.gov/authorities/names/n92085235 $9 ${createdRecordIDs[1]} $3 test`,
                to: '0  $a Bible. $l Polish. $s Biblia Płocka $d 1992 $e author $0 http://id.loc.gov/authorities/names/n92085235 $3 test',
              },
              {
                action: VersionHistorySection.fieldActions.EDITED,
                field: 'LDR',
                from: testData.ldrRegExp,
                to: testData.ldrRegExp,
              },
            ];

            const changesModalDataCard1 = [
              {
                action: VersionHistorySection.fieldActions.EDITED,
                field: '130',
                from: `0  $a Bible. $l Polish. $s Biblia Płocka $d 1992 $0 http://id.loc.gov/authorities/names/n92085235 $9 ${createdRecordIDs[1]}`,
                to: `0  $a Bible. $l Polish. $s Biblia Płocka $d 1992 $e author $0 http://id.loc.gov/authorities/names/n92085235 $9 ${createdRecordIDs[1]} $3 test`,
              },
              {
                action: VersionHistorySection.fieldActions.EDITED,
                field: 'LDR',
                from: testData.ldrRegExp,
                to: testData.ldrRegExp,
              },
            ];

            const changesModalDataCard2 = [
              {
                action: VersionHistorySection.fieldActions.EDITED,
                field: '130',
                from: '0  $a Holy Bible $l English. $s English Standard. $f 2016.',
                to: `0  $a Bible. $l Polish. $s Biblia Płocka $d 1992 $0 http://id.loc.gov/authorities/names/n92085235 $9 ${createdRecordIDs[1]}`,
              },
              {
                action: VersionHistorySection.fieldActions.EDITED,
                field: 'LDR',
                from: testData.ldrRegExp,
                to: testData.ldrRegExp,
              },
            ];

            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.verifyTagFieldAfterUnlinking(...bib130InitialFieldValues);

            InventoryInstance.verifyAndClickLinkIcon(testData.tag130);
            InventoryInstance.verifySelectMarcAuthorityModal();
            MarcAuthorities.switchToSearch();
            InventoryInstance.searchResults(testData.authorityHeading);
            MarcAuthorities.checkFieldAndContentExistence(
              testData.tag130,
              bib130LinkedFieldValues[4],
            );

            MarcAuthorities.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag130);

            QuickMarcEditor.verifyTagFieldAfterLinking(...bib130LinkedFieldValues);

            QuickMarcEditor.clickSaveAndKeepEditing();

            cy.wait(1000);
            QuickMarcEditor.fillEmptyTextAreaOfField(
              16,
              'records[16].subfieldGroups.uncontrolledAlpha',
              '$e author',
            );
            QuickMarcEditor.fillEmptyTextAreaOfField(
              16,
              'records[16].subfieldGroups.uncontrolledNumber',
              '$3 test',
            );
            QuickMarcEditor.verifyTagFieldAfterLinking(...bib130WithSubfieldsValues);

            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
            InstanceRecordView.verifyInstancePaneExists();

            InventoryInstance.verifyAlternativeTitle(
              0,
              1,
              `Linked to MARC authority${testData.authorityHeading}`,
            );

            InventoryInstance.clickViewAuthorityIconDisplayedInInstanceDetailsPane(
              testData.accordion,
            );
            MarcAuthorities.checkDetailViewIncludesText(testData.authorityHeading);
            InventoryInstance.goToPreviousPage();
            InventoryInstance.waitInventoryLoading();

            InventoryInstance.viewSource();
            InventoryInstance.checkExistanceOfAuthorityIconInMarcViewPane();

            InventoryInstance.clickViewAuthorityIconDisplayedInMarcViewPane();
            MarcAuthorities.checkDetailViewIncludesText(testData.authorityHeading);
            InventoryInstance.goToPreviousPage();

            InventoryViewSource.waitLoading();
            InventoryViewSource.close();
            InstanceRecordView.verifyInstancePaneExists();

            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.verifyTagFieldAfterLinking(...bib130WithSubfieldsValues);

            QuickMarcEditor.clickUnlinkIconInTagField(bib130UnlinkedFieldValues[0]);
            QuickMarcEditor.confirmUnlinkingField();
            QuickMarcEditor.verifyTagFieldAfterUnlinking(...bib130UnlinkedFieldValues);
            QuickMarcEditor.verifyIconsAfterUnlinking(bib130UnlinkedFieldValues[0]);

            QuickMarcEditor.pressSaveAndClose();
            cy.wait(1500);
            QuickMarcEditor.checkAfterSaveAndClose();

            InventoryInstance.checkAbsenceOfAuthorityIconInInstanceDetailPane(testData.accordion);

            InventoryInstance.viewSource();
            InventoryInstance.checkAbsenceOfAuthorityIconInMarcViewPane();

            InventoryViewSource.clickVersionHistoryButton();
            VersionHistorySection.verifyVersionHistoryPane(4);

            VersionHistorySection.checkChangeForCard(
              0,
              'Field 130',
              VersionHistorySection.fieldActions.EDITED,
            );
            VersionHistorySection.checkChangeForCard(
              0,
              'Field LDR',
              VersionHistorySection.fieldActions.EDITED,
            );

            VersionHistorySection.checkChangeForCard(
              1,
              'Field 130',
              VersionHistorySection.fieldActions.EDITED,
            );
            VersionHistorySection.checkChangeForCard(
              1,
              'Field LDR',
              VersionHistorySection.fieldActions.EDITED,
            );

            VersionHistorySection.openChangesForCard(0);
            VersionHistorySection.verifyChangesModal(
              testData.date,
              testData.user.firstName,
              testData.user.lastName,
            );
            changesModalDataCard0.forEach((change) => {
              VersionHistorySection.checkChangeInModal(...Object.values(change));
            });
            VersionHistorySection.closeChangesModal();

            VersionHistorySection.openChangesForCard(1);
            VersionHistorySection.verifyChangesModal(
              testData.date,
              testData.user.firstName,
              testData.user.lastName,
            );
            changesModalDataCard1.forEach((change) => {
              VersionHistorySection.checkChangeInModal(...Object.values(change));
            });
            VersionHistorySection.closeChangesModal();

            VersionHistorySection.openChangesForCard(2);
            VersionHistorySection.verifyChangesModal(
              testData.date,
              testData.user.firstName,
              testData.user.lastName,
            );
            changesModalDataCard2.forEach((change) => {
              VersionHistorySection.checkChangeInModal(...Object.values(change));
            });
            VersionHistorySection.closeChangesModal();
          },
        );
      });
    });
  });
});
