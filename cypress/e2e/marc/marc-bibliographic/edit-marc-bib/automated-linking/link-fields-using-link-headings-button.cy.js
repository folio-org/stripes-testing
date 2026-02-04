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
            rowIndex: 78,
            value: 'C388536 Stelfreeze, Brian',
            tag: 700,
          },
          {
            rowIndex: 79,
            value: 'C388536 Sprouse, Chris',
            tag: 700,
          },
        ];

        const createdAuthorityIDs = [];

        const linkableFields = [
          100, 240, 600, 610, 611, 630, 650, 651, 655, 700, 710, 711, 730, 800, 810, 811, 830,
        ];

        const matchingNaturalIds = [
          {
            rowIndex: 32,
            tag: '100',
            naturalId: 'n2008001084C388536',
          },
          {
            rowIndex: 33,
            tag: '240',
            naturalId: 'no2020024230C388536',
          },
          {
            rowIndex: 61,
            tag: '600',
            naturalId: 'n2016004081C388536',
          },
          {
            rowIndex: 58,
            tag: '630',
            naturalId: 'no2023006889C388536',
          },
          {
            rowIndex: 69,
            tag: '655',
            naturalId: 'gf2014026266C388536',
          },
          {
            rowIndex: 80,
            tag: '700',
            naturalId: 'no2011137752C388536',
          },
          {
            rowIndex: 82,
            tag: '700',
            naturalId: 'n77020008C388536',
          },
          {
            rowIndex: 84,
            tag: '700',
            naturalId: 'n91065740C388536',
          },
          {
            rowIndex: 83,
            tag: '710',
            naturalId: 'no2008081921C388536',
          },
          {
            rowIndex: 85,
            tag: '711',
            naturalId: 'n84745425C388536',
          },
          {
            rowIndex: 87,
            tag: '800',
            naturalId: 'n79023811C388536',
          },
          {
            rowIndex: 90,
            tag: '830',
            naturalId: 'no2018018754C388536',
          },
        ];

        const notMatchingNaturalIds = [
          {
            rowIndex: 56,
            tag: '610',
            naturalId: 'nb20090244889',
          },
          {
            rowIndex: 57,
            tag: '611',
            naturalId: 'n822167579',
          },
          {
            rowIndex: 63,
            tag: '650',
            naturalId: 'sh20091259899',
          },
          {
            rowIndex: 67,
            tag: '651',
            naturalId: 'sh850015319',
          },
          {
            rowIndex: 81,
            tag: '700',
            naturalId: 'n831692679',
          },
          {
            rowIndex: 86,
            tag: '730',
            naturalId: 'n790660959',
          },
          {
            rowIndex: 88,
            tag: '810',
            naturalId: 'n800955859',
          },
          {
            rowIndex: 89,
            tag: '811',
            naturalId: 'no20181255879',
          },
        ];

        before('Creating user and data', () => {
          cy.getAdminToken();
          // make sure there are no duplicate records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C388536');
          [...matchingNaturalIds, ...notMatchingNaturalIds].forEach((query) => {
            MarcAuthorities.getMarcAuthoritiesViaApi({
              limit: 100,
              query: `(keyword all "${query}" or identifiers.value=="${query.naturalId}" or naturalId="${query.naturalId}")`,
            }).then((authorities) => {
              if (authorities) {
                authorities.forEach(({ id }) => {
                  MarcAuthority.deleteViaAPI(id, true);
                });
              }
            });
          });

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

            cy.loginAsAdmin({
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
              authRefresh: true,
            }).then(() => {
              InventoryInstances.searchByTitle(createdAuthorityIDs[0]);
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
              QuickMarcEditor.pressSaveAndCloseButton();
              QuickMarcEditor.checkAfterSaveAndClose();
            });
          });
        });

        beforeEach('Login to the application', () => {
          cy.getAdminToken();
          linkableFields.forEach((tag) => {
            QuickMarcEditor.setRulesForField(tag, true);
          });
          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
            authRefresh: true,
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
          { tags: ['smoke', 'spitfire', 'C388536'] },
          () => {
            InventoryInstances.searchByTitle(createdAuthorityIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.verifyTagFieldAfterLinking(
              78,
              '700',
              '1',
              '\\',
              '$a C388536 Stelfreeze, Brian',
              '$e artist.',
              '$0 http://id.loc.gov/authorities/names/n91065740C388536',
              '',
            );
            QuickMarcEditor.verifyTagFieldAfterLinking(
              79,
              '700',
              '1',
              '\\',
              '$a C388536 Sprouse, Chris',
              '$e artist.',
              '$0 http://id.loc.gov/authorities/names/nb98017694',
              '',
            );
            QuickMarcEditor.checkLinkHeadingsButton();

            for (let i = 78; i < 84; i++) {
              QuickMarcEditor.clickArrowDownButton(i);
            }
            QuickMarcEditor.deleteField(79);
            QuickMarcEditor.deleteField(78);
            QuickMarcEditor.afterDeleteNotification('700');
            QuickMarcEditor.clickLinkHeadingsButton();
            cy.wait(1000);
            const successCalloutText =
              'Field 100, 240, 600, 630, 655, 700, 710, 711, 800, and 830 has been linked to MARC authority record(s).';
            QuickMarcEditor.checkCallout(successCalloutText);
            QuickMarcEditor.closeCallout(successCalloutText);
            const manualLinkingCalloutText =
              'Field 610, 611, 650, 651, 700, 730, 810, and 811 must be set manually by selecting the link icon.';
            QuickMarcEditor.checkCallout(manualLinkingCalloutText);
            QuickMarcEditor.closeCallout(manualLinkingCalloutText);

            QuickMarcEditor.checkLinkHeadingsButton();
            QuickMarcEditor.afterDeleteNotification('700');
            QuickMarcEditor.verifyTagFieldAfterLinking(
              84,
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

            QuickMarcEditor.clickRestoreDeletedField();
            QuickMarcEditor.verifyTagFieldAfterLinking(
              78,
              '700',
              '1',
              '\\',
              '$a C388536 Sprouse, Chris',
              '$e artist.',
              '$0 http://id.loc.gov/authorities/names/nb98017694',
              '',
            );
            QuickMarcEditor.verifyTagFieldAfterUnlinking(
              79,
              '700',
              '1',
              '\\',
              '$a C388536 Martin, Laura $c (Comic book artist), $e colorist. $0 n2014052262C388536',
            );

            QuickMarcEditor.clickLinkHeadingsButton();
            cy.wait(1000); // Give the UI time to show the callout
            const successCalloutText2 = 'Field 700 has been linked to MARC authority record(s).';
            QuickMarcEditor.checkCallout(successCalloutText2);
            QuickMarcEditor.closeCallout(successCalloutText2);
            const manualLinkingCalloutText2 =
              'Field 610, 611, 650, 651, 700, 730, 810, and 811 must be set manually by selecting the link icon.';
            QuickMarcEditor.checkCallout(manualLinkingCalloutText2);
            QuickMarcEditor.closeCallout(manualLinkingCalloutText2);

            QuickMarcEditor.verifyTagWithNaturalIdExistance(79, '700', 'n2014052262C388536');
            notMatchingNaturalIds.forEach((matchs) => {
              QuickMarcEditor.verifyTagWithNaturalIdExistance(
                matchs.rowIndex,
                matchs.tag,
                matchs.naturalId,
                `records[${matchs.rowIndex}].content`,
              );
            });
            QuickMarcEditor.checkLinkHeadingsButton();
            QuickMarcEditor.clickSaveAndKeepEditing();
            QuickMarcEditor.verifyTagFieldAfterLinking(
              78,
              '700',
              '1',
              '\\',
              '$a C388536 Sprouse, Chris',
              '$e artist.',
              '$0 http://id.loc.gov/authorities/names/nb98017694',
              '',
            );
            QuickMarcEditor.verifyTagFieldAfterLinking(
              84,
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
