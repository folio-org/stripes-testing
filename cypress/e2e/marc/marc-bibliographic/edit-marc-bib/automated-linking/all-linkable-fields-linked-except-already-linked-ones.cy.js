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
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../support/constants';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      describe('Automated linking', () => {
        let userData = {};
        const marcAuthIcon = 'Linked to MARC authority';

        const marcFiles = [
          {
            marc: 'marcBibFileForC388534.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            numOfRecords: 1,
            propertyName: 'instance',
          },
          {
            marc: 'marcAuthFileForC388534.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 20,
            propertyName: 'authority',
          },
        ];

        const linkingTagAndValues = [
          {
            rowIndex: 82,
            value: 'C388534 Lee, Stan, 1922-2018,',
            tag: 700,
            boxFourth: '$a C388534 Lee, Stan, $d 1922-2018',
            boxFifth: '$e creator.',
            boxSixth: '$0 http://id.loc.gov/authorities/names/n83169267C388534',
            boxSeventh: '',
          },
          {
            rowIndex: 84,
            value: 'C388534 Robinson & Associates, Inc.',
            tag: 710,
            boxFourth: '$a C388534 Robinson & Associates, Inc.',
            boxFifth: '',
            boxSixth: '$0 http://id.loc.gov/authorities/names/no2008081921C388534',
            boxSeventh: '',
          },
          {
            rowIndex: 85,
            value:
              'C388534 Delaware Symposium on Language Studies. Delaware symposia on language studies 1985',
            tag: 711,
            boxFourth:
              '$a C388534 Delaware Symposium on Language Studies. $t Delaware symposia on language studies $f 1985',
            boxFifth: '',
            boxSixth: '$0 http://id.loc.gov/authorities/names/n84745425C388534',
            boxSeventh: '',
          },
          {
            rowIndex: 86,
            value: 'C388534 Gone with the wind (Motion picture : 1939)',
            tag: 730,
            boxFourth: '$a C388534 Gone with the wind $g (Motion picture : $f 1939)',
            boxFifth: '',
            boxSixth: '$0 http://id.loc.gov/authorities/names/n79066095C388534',
            boxSeventh: '',
          },
        ];

        const fields = [
          {
            rowIndex: 32,
            tag: '100',
            naturalId: 'n2008001084C388534',
          },
          {
            rowIndex: 33,
            tag: '240',
            naturalId: 'no2020024230C388534',
          },
          {
            rowIndex: 61,
            tag: '600',
            naturalId: 'n2016004081C388534',
          },
          {
            rowIndex: 56,
            tag: '610',
            naturalId: 'nb2009024488C388534',
          },
          {
            rowIndex: 57,
            tag: '611',
            naturalId: 'n82216757C388534',
          },
          {
            rowIndex: 58,
            tag: '630',
            naturalId: 'no2023006889C388534',
          },
          {
            rowIndex: 63,
            tag: '650',
            naturalId: 'sh2009125989C388534',
          },
          {
            rowIndex: 67,
            tag: '651',
            naturalId: 'sh85001531C388534',
          },
          {
            rowIndex: 69,
            tag: '655',
            naturalId: 'gf2014026266C388534',
          },
          {
            rowIndex: 87,
            tag: '800',
            naturalId: 'n79023811C388534',
          },
          {
            rowIndex: 88,
            tag: '810',
            naturalId: 'n80095585C388534',
          },
          {
            rowIndex: 89,
            tag: '811',
            naturalId: 'no2018125587C388534',
          },
          {
            rowIndex: 90,
            tag: '830',
            naturalId: 'no2018018754C388534',
          },
        ];

        const createdRecordsIDs = [];

        const linkableFields = [
          100, 240, 600, 610, 611, 630, 650, 651, 655, 700, 710, 711, 730, 800, 810, 811, 830,
        ];

        before('Creating user and data', () => {
          cy.getAdminToken();
          // make sure there are no duplicate authority records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C388534*');

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ]).then((createdUserProperties) => {
            userData = createdUserProperties;

            marcFiles.forEach((marcFile) => {
              DataImport.uploadFileViaApi(
                marcFile.marc,
                marcFile.fileName,
                marcFile.jobProfileToRun,
              ).then((response) => {
                response.forEach((record) => {
                  createdRecordsIDs.push(record[marcFile.propertyName].id);
                });
              });
            });

            cy.loginAsAdmin();
            cy.visit(TopMenu.inventoryPath).then(() => {
              InventoryInstances.searchByTitle(createdRecordsIDs[0]);
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

            cy.login(userData.username, userData.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
              authRefresh: true,
            });
          });
        });

        after('Deleting created user and data', () => {
          cy.getAdminToken();
          Users.deleteViaApi(userData.userId);
          InventoryInstance.deleteInstanceViaApi(createdRecordsIDs[0]);
          createdRecordsIDs.forEach((id, index) => {
            if (index) MarcAuthority.deleteViaAPI(id, true);
          });
        });

        it(
          'C388534 All linkable fields are linked after clicking on the "Link headings" button when edit "MARC bib" except already linked fields (spitfire) (TaaS)',
          { tags: ['criticalPathFlaky', 'spitfire', 'C388534'] },
          () => {
            InventoryInstances.searchByTitle(createdRecordsIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            fields.forEach((matchs) => {
              QuickMarcEditor.verifyTagWithNaturalIdExistance(
                matchs.rowIndex,
                matchs.tag,
                matchs.naturalId,
                `records[${matchs.rowIndex}].content`,
              );
            });
            linkingTagAndValues.forEach((field) => {
              QuickMarcEditor.verifyTagFieldAfterLinking(
                field.rowIndex,
                `${field.tag}`,
                '1',
                '\\',
                field.boxFourth,
                field.boxFifth,
                field.boxSixth,
                field.boxSeventh,
              );
            });

            // move this step here from the precondition due to a concurrency issue in parallel runs
            cy.getAdminToken();
            linkableFields.forEach((tag) => {
              QuickMarcEditor.setRulesForField(tag, true);
            });
            cy.wait(2000);
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();
            QuickMarcEditor.clickLinkHeadingsButton();
            QuickMarcEditor.checkCallout(
              'Field 100, 240, 600, 610, 611, 630, 650, 651, 655, 800, 810, 811, and 830 has been linked to MARC authority record(s).',
            );
            QuickMarcEditor.verifyDisabledLinkHeadingsButton();
            linkingTagAndValues.forEach((field) => {
              QuickMarcEditor.verifyTagFieldAfterLinking(
                field.rowIndex,
                `${field.tag}`,
                '1',
                '\\',
                field.boxFourth,
                field.boxFifth,
                field.boxSixth,
                field.boxSeventh,
              );
            });
            cy.wait(1000);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();

            InventoryInstance.viewSource();
            fields.forEach((field) => {
              InventoryViewSource.contains(`${marcAuthIcon}\n\t${field.tag}`);
            });
            linkingTagAndValues.forEach((field) => {
              InventoryViewSource.contains(`${marcAuthIcon}\n\t${field.tag}`);
            });
          },
        );
      });
    });
  });
});
