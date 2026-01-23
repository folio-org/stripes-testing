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
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../support/constants';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      describe('Automated linking', () => {
        const testData = {
          marcAuthIcon: 'Linked to MARC authority',
          successCalloutAfterLinking:
            'Field 100, 240, 600, 610, 611, 630, 650, 651, 655, 700, 710, 711, 730, 800, 810, 811, and 830 has been linked to MARC authority record(s).',
          errorCalloutAfterLinking:
            'Field 100, 240, 600, 610, 611, 630, 650, 651, 655, 700, 710, 711, 730, 800, 810, 811, and 830 must be set manually by selecting the link icon.',
        };

        const marcFiles = [
          {
            marc: 'marcBibFileForC387538.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            numOfRecords: 1,
            propertyName: 'instance',
          },
          {
            marc: 'marcBibFileForC388500.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            numOfRecords: 1,
            propertyName: 'instance',
          },
          {
            marc: 'marcAuthFileForC387538.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 20,
            propertyName: 'authority',
          },
        ];

        const createdRecordsIDs = [];

        const linkableFields = [
          100, 240, 600, 610, 611, 630, 650, 651, 655, 700, 710, 711, 730, 800, 810, 811, 830,
        ];

        const fields = [
          {
            rowIndex: 32,
            tag: '100',
            naturalId: 'n2008001084C387538',
            value: 'C387538 Coates, Ta-Nehisi',
            type: 'Contributor',
          },
          {
            rowIndex: 33,
            tag: '240',
            naturalId: 'no2020024230C387538',
            value: 'C387538 Black Panther',
            type: 'Title data',
          },
          {
            rowIndex: 61,
            tag: '600',
            naturalId: 'n2016004081C387538',
            value: 'C387538 Black Panther (Fictitious character)',
            type: 'Subject',
          },
          {
            rowIndex: 56,
            tag: '610',
            naturalId: 'nb2009024488C387538',
            value: 'C387538 Black Panther Movement',
            type: 'Subject',
          },
          {
            rowIndex: 57,
            tag: '611',
            naturalId: 'n82216757C387538',
            value: 'C387538 Panther Photographic International',
            type: 'Subject',
          },
          {
            rowIndex: 58,
            tag: '630',
            naturalId: 'no2023006889C387538',
            value: 'C387538 Black Panther, Wakanda forever (Motion picture)',
            type: 'Subject',
          },
          {
            rowIndex: 63,
            tag: '650',
            naturalId: 'sh2009125989C387538',
            value: 'C387538 Good and evil',
            type: 'Subject',
          },
          {
            rowIndex: 67,
            tag: '651',
            naturalId: 'sh85001531C387538',
            value: 'C387538 Africa',
            type: 'Subject',
          },
          {
            rowIndex: 69,
            tag: '655',
            naturalId: 'gf2014026266C387538',
            value: 'C387538 Comics (Graphic works)',
            type: 'Subject',
          },
          {
            rowIndex: 82,
            tag: '700',
            naturalId: 'n83169267C387538',
            value: 'C387538 Lee, Stan, 1922-2018',
            type: 'Contributor',
          },
          {
            rowIndex: 84,
            tag: '710',
            naturalId: 'no2008081921C387538',
            value: 'C387538 Robinson & Associates, Inc',
            type: 'Contributor',
          },
          {
            rowIndex: 85,
            tag: '711',
            naturalId: 'n84745425C387538',
            value:
              'C387538 Delaware Symposium on Language Studies. Delaware symposia on language studies 1985',
            type: 'Contributor',
          },
          {
            rowIndex: 86,
            tag: '730',
            naturalId: 'n79066095C387538',
            value: 'C387538 Lee, Stan, 1922-2018',
            type: 'Contributor',
          },
          {
            rowIndex: 87,
            tag: '800',
            naturalId: 'n79023811C387538',
            value: 'C387538 Neilson, Donald, 1936-2011',
            type: 'Title data',
          },
          {
            rowIndex: 88,
            tag: '810',
            naturalId: 'n80095585C387538',
            value: 'C387538 Black Panther Party',
            type: 'Title data',
          },
          {
            rowIndex: 89,
            tag: '811',
            naturalId: 'no2018125587C387538',
            value: 'C387538 Stockholm International Film Festival',
            type: 'Title data',
          },
          {
            rowIndex: 90,
            tag: '830',
            naturalId: 'no2018018754C387538',
            value: 'C387538 Black Panther (Motion picture : 2018)',
            type: 'Title data',
          },
        ];

        before('Creating user and data', () => {
          cy.getAdminToken();
          // make sure there are no duplicate authority records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C387538*');

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
          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ]).then((createdUserProperties) => {
            testData.userProperties = createdUserProperties;
          });
        });

        after('Deleting created user and data', () => {
          cy.getAdminToken();
          Users.deleteViaApi(testData.userProperties.userId);
          InventoryInstance.deleteInstanceViaApi(createdRecordsIDs[0]);
          InventoryInstance.deleteInstanceViaApi(createdRecordsIDs[1]);
          for (let i = 2; i < 22; i++) {
            MarcAuthority.deleteViaAPI(createdRecordsIDs[i], true);
          }
        });

        it(
          'C387538 All linkable fields are linked after clicking on the "Link headings" button when edit "MARC bib" (spitfire)',
          { tags: ['criticalPathFlaky', 'spitfire', 'C387538'] },
          () => {
            cy.getAdminToken();
            linkableFields.forEach((tag) => {
              QuickMarcEditor.setRulesForField(tag, true);
            });

            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
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
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();
            QuickMarcEditor.clickLinkHeadingsButton();
            QuickMarcEditor.checkCallout(testData.successCalloutAfterLinking);
            fields.forEach((matchs) => {
              QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(matchs.rowIndex);
            });
            QuickMarcEditor.verifyDisabledLinkHeadingsButton();
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
            fields.forEach((field) => {
              InventoryInstance.verifyRecordAndMarcAuthIcon(
                field.type,
                `${testData.marcAuthIcon}\n${field.value}`,
              );
            });

            InventoryInstance.viewSource();
            fields.forEach((field) => {
              InventoryViewSource.contains(`${testData.marcAuthIcon}\n\t${field.tag}`);
            });
            InventoryInstance.checkExistanceOfAuthorityIconInMarcViewPane();
            InventoryInstance.marcAuthViewIconClickUsingId(createdRecordsIDs[2]);
          },
        );

        it(
          'C388500 All linkable fields are NOT linked after clicking on the "Link headings" button when edit "MARC bib" (spitfire)',
          { tags: ['criticalPath', 'spitfire', 'C388500'] },
          () => {
            cy.getAdminToken();
            linkableFields.forEach((tag) => {
              QuickMarcEditor.setRulesForField(tag, true);
            });

            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            InventoryInstances.searchByTitle(createdRecordsIDs[1]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();
            QuickMarcEditor.clickLinkHeadingsButton();
            QuickMarcEditor.checkCallout(testData.errorCalloutAfterLinking);
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();
            QuickMarcEditor.checkButtonsDisabled();
            QuickMarcEditor.updateExistingField(
              fields[0].tag,
              '$a Coates, Ta-Nehisi, $eauthor. $0 n2008001084',
            );
            QuickMarcEditor.checkButtonsEnabled();
            QuickMarcEditor.pressSaveAndClose();
            cy.wait(1500);
            QuickMarcEditor.checkAfterSaveAndClose();
            InventoryInstance.checkAbsenceOfAuthorityIconInInstanceDetailPane('Contributor');
            InventoryInstance.checkAbsenceOfAuthorityIconInInstanceDetailPane('Subject');
            InventoryInstance.checkAbsenceOfAuthorityIconInInstanceDetailPane('Title data');
          },
        );
      });
    });
  });
});
