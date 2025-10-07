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
        let userData;
        const linkableFields = [
          100, 110, 111, 130, 240, 600, 610, 611, 630, 650, 651, 655, 700, 710, 711, 730, 800, 810,
          811, 830,
        ];
        const newFields = [
          {
            rowIndex: 32,
            tag: '700',
            content: '$a test $0 n 83169267',
            newContent: '$a test $0 n83169267',
            secondBox: '2',
            thirdBox: '\\',
            fourthBox: '$a C388519Lee, Stan, $d 1922-2018',
            fifthBox: '',
            sixthBox: '$0 http://id.loc.gov/authorities/names/n83169267',
            seventhBox: '',
            isLinked: true,
          },
          {
            rowIndex: 33,
            tag: '700',
            content: '$0 nb98017694 $2 tst $e author',
            secondBox: '2',
            thirdBox: '\\',
            fourthBox: '$a C388519Sprouse, Chris',
            fifthBox: '$e author',
            sixthBox: '$0 http://id.loc.gov/authorities/names/nb98017694',
            seventhBox: '$2 tst',
            isLinked: true,
          },
          {
            rowIndex: 34,
            tag: '700',
            content: '$0 no2021056177 $a Chin S. $d unknown',
            secondBox: '2',
            thirdBox: '\\',
            fourthBox: '$a C388519Chin, Staceyann, $d 1972- $t Crossfire. $h Spoken word',
            fifthBox: '',
            sixthBox: '$0 http://id.loc.gov/authorities/names/no2021056177',
            seventhBox: '',
            isLinked: true,
          },
          {
            rowIndex: 35,
            tag: '100',
            secondBox: '\\',
            thirdBox: '\\',
            content: '$a Chinn',
            isLinked: false,
          },
          {
            rowIndex: 36,
            tag: '700',
            secondBox: '2',
            thirdBox: '\\',
            content: '$a test 2 $0 nt4433',
            newContent: '$a test 2 $0 http://id.loc.gov/authorities/names/no2021056177',
            isLinked: false,
          },
        ];
        const field700 = {
          rowIndex: 37,
          tag: '700',
          secondBox: '2',
          thirdBox: '\\',
          content: '$a test 4 $0 n83169267',
        };

        const createdRecordIDs = [];
        const naturalIds = ['n83169267', 'no2021056177', 'nb98017694'];
        const marcFiles = [
          {
            marc: 'marcBibFileForC388519.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            numOfRecords: 1,
            propertyName: 'instance',
          },
          {
            marc: 'marcAuthFileForC388519-1.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
          {
            marc: 'marcAuthFileForC388519-2.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
          {
            marc: 'marcAuthFileForC388519-3.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
        ];

        before('Create test data', () => {
          // Making sure there are no duplicate authority records in the system before auto-linking
          cy.getAdminToken().then(() => {
            naturalIds.forEach((id) => {
              MarcAuthorities.getMarcAuthoritiesViaApi({
                limit: 200,
                query: `naturalId="${id}*" and authRefType=="Authorized"`,
              }).then((records) => {
                records.forEach((record) => {
                  MarcAuthority.deleteViaAPI(record.id);
                });
              });
            });
          });

          cy.getAdminToken();
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
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ]).then((createdUserProperties) => {
            userData = createdUserProperties;

            linkableFields.forEach((field) => QuickMarcEditor.setRulesForField(field, true));

            cy.login(userData.username, userData.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
              authRefresh: true,
            });
          });
        });

        after('Delete test data', () => {
          cy.getAdminToken().then(() => {
            Users.deleteViaApi(userData.userId);
            createdRecordIDs.forEach((id, index) => {
              if (index === 0) {
                InventoryInstance.deleteInstanceViaApi(id);
              } else {
                MarcAuthority.deleteViaAPI(id);
              }
            });
          });
        });

        it(
          'C388519 Automated link of created by user fields when edit "MARC bib" (spitfire) (TaaS)',
          { tags: ['extendedPath', 'spitfire', 'C388519'] },
          () => {
            // #1 Find and open detail view of "MARC Bib" record record from precondition, ex. of search query:
            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            // #2 Click on "Actions" button in third pane → Select "Edit MARC bibliographic record" option
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.verifyDisabledLinkHeadingsButton();
            // #3 Create 1 new field by clicking on the "Add a new field" icon and fill it
            QuickMarcEditor.addNewField(
              newFields[0].tag,
              newFields[0].content,
              newFields[0].rowIndex - 1,
            );
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();
            // #4 Click on the "Link headings" button.
            QuickMarcEditor.clickLinkHeadingsButton();
            QuickMarcEditor.checkCallout(
              'Field 700 must be set manually by selecting the link icon.',
            );
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();
            // #5 Remove space between prefix and digit value in "$0" in added field
            QuickMarcEditor.addValuesToExistingField(
              newFields[0].rowIndex - 1,
              newFields[0].tag,
              newFields[0].newContent,
              newFields[0].secondBox,
              newFields[0].thirdBox,
            );
            // #6 Create 4 new fields by clicking on the "Add a new field" icon and fill them as specified:
            newFields.forEach((field, index) => {
              if (index > 0) {
                QuickMarcEditor.addNewField(field.tag, field.content, field.rowIndex - 1);
                QuickMarcEditor.addValuesToExistingField(
                  field.rowIndex - 1,
                  field.tag,
                  field.content,
                  field.secondBox,
                  field.thirdBox,
                );
              }
            });
            // #7 Click on the "Link headings" button.
            QuickMarcEditor.clickLinkHeadingsButton();
            QuickMarcEditor.checkCallout('Field 700 has been linked to MARC authority record(s).');
            QuickMarcEditor.checkCallout(
              'Field 700 must be set manually by selecting the link icon.',
            );
            newFields.forEach((field) => {
              if (field.isLinked) {
                QuickMarcEditor.verifyTagFieldAfterLinking(
                  field.rowIndex,
                  field.tag,
                  field.secondBox,
                  field.thirdBox,
                  field.fourthBox,
                  field.fifthBox,
                  field.sixthBox,
                  field.seventhBox,
                );
              } else {
                QuickMarcEditor.verifyRowLinked(field.rowIndex, false);
              }
            });
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();
            // #8 Edit created by user field with invalid "$0" to be valid
            QuickMarcEditor.updateExistingFieldContent(
              newFields[4].rowIndex,
              newFields[4].newContent,
            );
            // #9 Create 1 new field by clicking on the "Add a new field" icon and fill it as specified: fill only "$0" subfield with valid value
            QuickMarcEditor.addNewField(field700.tag, field700.content, field700.rowIndex - 1);
            QuickMarcEditor.addValuesToExistingField(
              field700.rowIndex - 1,
              field700.tag,
              field700.content,
              field700.secondBox,
              field700.thirdBox,
            );
            // #10 Click on the "Save & keep editing" button
            QuickMarcEditor.clickSaveAndKeepEditingButton();
            cy.wait(1500);
            QuickMarcEditor.clickSaveAndKeepEditing();
            newFields.forEach((field) => {
              QuickMarcEditor.verifyRowLinked(field.rowIndex, field.isLinked);
            });
          },
        );
      });
    });
  });
});
