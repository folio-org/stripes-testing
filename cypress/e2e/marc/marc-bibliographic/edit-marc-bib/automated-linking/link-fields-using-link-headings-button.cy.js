import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../support/constants';
import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
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
        const testData = {};

        const marcFiles = [
          {
            marc: 'marcBibFileForC388536.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            numOfRecords: 1,
            propertyName: 'instance',
          },
          {
            marc: 'marcAuthFileForC388536.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 25,
            propertyName: 'authority',
          },
        ];

        const linkingTagAndValues = [
          {
            rowIndex: 81,
            value: 'C388536 Stelfreeze, Brian',
            tag: 700,
          },
          {
            rowIndex: 82,
            value: 'C388536 Sprouse, Chris',
            tag: 700,
          },
        ];

        const createdAuthorityIDs = [];

        const linkableFields = [
          100, 110, 111, 130, 240, 600, 610, 611, 630, 650, 651, 655, 700, 710, 711, 730, 800, 810,
          811, 830,
        ];

        const matchingNaturalIds = [
          {
            rowIndex: 32,
            tag: '100',
            naturalId: 'n2008001084C388536',
          },
          {
            rowIndex: 36,
            tag: '240',
            naturalId: 'no2020024230C388536',
          },
          {
            rowIndex: 64,
            tag: '600',
            naturalId: 'n2016004081C388536',
          },
          {
            rowIndex: 61,
            tag: '630',
            naturalId: 'no2023006889C388536',
          },
          {
            rowIndex: 72,
            tag: '655',
            naturalId: 'gf2014026266C388536',
          },
          {
            rowIndex: 83,
            tag: '700',
            naturalId: 'no2011137752C388536',
          },
          {
            rowIndex: 85,
            tag: '700',
            naturalId: 'n77020008C388536',
          },
          {
            rowIndex: 87,
            tag: '700',
            naturalId: 'n91065740C388536',
          },
          {
            rowIndex: 86,
            tag: '710',
            naturalId: 'no2008081921C388536',
          },
          {
            rowIndex: 88,
            tag: '711',
            naturalId: 'n84745425C388536',
          },
          {
            rowIndex: 90,
            tag: '800',
            naturalId: 'n79023811C388536',
          },
          {
            rowIndex: 93,
            tag: '830',
            naturalId: 'no2018018754C388536',
          },
        ];

        const notMatchingNaturalIds = [
          {
            rowIndex: 33,
            tag: '110',
            naturalId: 'no20061082779',
          },
          {
            rowIndex: 34,
            tag: '111',
            naturalId: 'no20091764299',
          },
          {
            rowIndex: 35,
            tag: '130',
            naturalId: 'n800269809',
          },
          {
            rowIndex: 59,
            tag: '610',
            naturalId: 'nb20090244889',
          },
          {
            rowIndex: 60,
            tag: '611',
            naturalId: 'n822167579',
          },
          {
            rowIndex: 66,
            tag: '650',
            naturalId: 'sh20091259899',
          },
          {
            rowIndex: 70,
            tag: '651',
            naturalId: 'sh850015319',
          },
          {
            rowIndex: 84,
            tag: '700',
            naturalId: 'n831692679',
          },
          {
            rowIndex: 89,
            tag: '730',
            naturalId: 'n790660959',
          },
          {
            rowIndex: 91,
            tag: '810',
            naturalId: 'n800955859',
          },
          {
            rowIndex: 92,
            tag: '811',
            naturalId: 'no20181255879',
          },
        ];

        before('Creating user and data', () => {
          cy.getAdminToken();
          // make sure there are no duplicate records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C388536*');

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
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ]).then((createdUserProperties) => {
            testData.userProperties = createdUserProperties;

            cy.loginAsAdmin();
            cy.visit(TopMenu.inventoryPath).then(() => {
              InventoryInstances.searchByTitle(createdAuthorityIDs[0]);
              InventoryInstances.selectInstance();
              InventoryInstance.editMarcBibliographicRecord();

              linkableFields.forEach((tag) => {
                QuickMarcEditor.setRulesForField(tag, true);
              });
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
              cy.wait(1500);
              QuickMarcEditor.pressSaveAndClose();
              QuickMarcEditor.checkAfterSaveAndClose();
            });
          });
        });

        beforeEach('Login to the application', () => {
          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });

        after('Deleting created user and data', () => {
          cy.getAdminToken();
          Users.deleteViaApi(testData.userProperties.userId);
          InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[0]);
          createdAuthorityIDs.forEach((id, index) => {
            if (index) MarcAuthority.deleteViaAPI(id);
          });
        });

        it(
          'C388536 Some of linkable fields are linked (and some are not) after clicking on the "Link headings" button when edit "MARC bib" except already linked fields (spitfire)',
          { tags: ['smoke', 'spitfire'] },
          () => {
            InventoryInstances.searchByTitle(createdAuthorityIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.verifyTagFieldAfterLinking(
              81,
              '700',
              '1',
              '\\',
              '$a C388536 Stelfreeze, Brian',
              '$e artist.',
              '$0 http://id.loc.gov/authorities/names/n91065740C388536',
              '',
            );
            QuickMarcEditor.verifyTagFieldAfterLinking(
              82,
              '700',
              '1',
              '\\',
              '$a C388536 Sprouse, Chris',
              '$e artist.',
              '$0 http://id.loc.gov/authorities/names/nb98017694',
              '',
            );
            QuickMarcEditor.checkLinkHeadingsButton();

            for (let i = 81; i < 87; i++) {
              QuickMarcEditor.clickArrowDownButton(i);
            }
            QuickMarcEditor.deleteField(82);
            QuickMarcEditor.deleteField(81);
            QuickMarcEditor.afterDeleteNotification('700');

            QuickMarcEditor.clickLinkHeadingsButton();
            cy.wait(1000);
            QuickMarcEditor.checkCallout(
              'Field 100, 240, 600, 630, 655, 700, 710, 711, 800, and 830 has been linked to MARC authority record(s).',
            );
            cy.wait(1000);
            QuickMarcEditor.checkCallout(
              'Field 110, 111, 130, 610, 611, 650, 651, 700, 730, 810, and 811 must be set manually by selecting the link icon.',
            );
            QuickMarcEditor.checkLinkHeadingsButton();
            QuickMarcEditor.afterDeleteNotification('700');
            QuickMarcEditor.verifyTagFieldAfterLinking(
              87,
              '700',
              '1',
              '\\',
              '$a C388536 Stelfreeze, Brian',
              '$e artist.',
              '$0 http://id.loc.gov/authorities/names/n91065740C388536',
              '',
            );
            matchingNaturalIds.forEach((matchs) => {
              QuickMarcEditor.verifyTagWithNaturalIdExistance(
                matchs.rowIndex,
                matchs.tag,
                matchs.naturalId,
              );
            });
            notMatchingNaturalIds.forEach((matchs) => {
              QuickMarcEditor.verifyTagWithNaturalIdExistance(
                matchs.rowIndex,
                matchs.tag,
                matchs.naturalId,
                `records[${matchs.rowIndex}].content`,
              );
            });
            QuickMarcEditor.clickSaveAndKeepEditingButton();
            cy.wait(1500);
            QuickMarcEditor.clickSaveAndKeepEditingButton();
            QuickMarcEditor.clickRestoreDeletedField();
            QuickMarcEditor.verifyTagFieldAfterLinking(
              81,
              '700',
              '1',
              '\\',
              '$a C388536 Sprouse, Chris',
              '$e artist.',
              '$0 http://id.loc.gov/authorities/names/nb98017694',
              '',
            );
            QuickMarcEditor.verifyTagFieldAfterUnlinking(
              82,
              '700',
              '1',
              '\\',
              '$a C388536 Martin, Laura $c (Comic book artist), $e colorist. $0 n2014052262',
            );

            QuickMarcEditor.clickLinkHeadingsButton();
            cy.wait(1000);
            QuickMarcEditor.checkCallout('Field 700 has been linked to MARC authority record(s).');
            cy.wait(1000);
            QuickMarcEditor.checkCallout(
              'Field 110, 111, 130, 610, 611, 650, 651, 700, 730, 810, and 811 must be set manually by selecting the link icon.',
            );
            QuickMarcEditor.verifyTagWithNaturalIdExistance(82, '700', 'n2014052262');
            notMatchingNaturalIds.forEach((matchs) => {
              QuickMarcEditor.verifyTagWithNaturalIdExistance(
                matchs.rowIndex,
                matchs.tag,
                matchs.naturalId,
                `records[${matchs.rowIndex}].content`,
              );
            });
            QuickMarcEditor.checkLinkHeadingsButton();
            QuickMarcEditor.clickSaveAndKeepEditingButton();
            cy.wait(1500);
            QuickMarcEditor.clickSaveAndKeepEditingButton();
            QuickMarcEditor.verifyTagFieldAfterLinking(
              81,
              '700',
              '1',
              '\\',
              '$a C388536 Sprouse, Chris',
              '$e artist.',
              '$0 http://id.loc.gov/authorities/names/nb98017694',
              '',
            );
            QuickMarcEditor.verifyTagFieldAfterLinking(
              87,
              '700',
              '1',
              '\\',
              '$a C388536 Stelfreeze, Brian',
              '$e artist.',
              '$0 http://id.loc.gov/authorities/names/n91065740C388536',
              '',
            );
            // Wait for requests to be finished.
            cy.wait(3000);
          },
        );
      });
    });
  });
});
