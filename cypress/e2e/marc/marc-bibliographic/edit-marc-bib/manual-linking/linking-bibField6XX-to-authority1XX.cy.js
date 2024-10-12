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
      describe('Manual linking', () => {
        const testData = {
          calloutUpdatedRecord:
            'This record has successfully saved and is in process. Changes may not appear immediately.',
        };

        const marcFiles = [
          {
            marc: 'marcBibFileForC377026.mrc',
            fileName: `testMarcFileC377026${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            propertyName: 'instance',
          },
          {
            marc: 'marcAuthFileForC377026.mrc',
            fileName: `testMarcFile377026.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            authorityHeading: 'C377026Black Panther (Fictitious character) Wakanda Forever',
            propertyName: 'authority',
          },
        ];

        const createdRecordIDs = [];

        const bib6XXAfterLinkingToAuth1XX = [
          {
            searchValue: 'C377026 Black Panther Numeration (Fictitious character) Dates',
            rowIndex: 45,
            tagValue: '600',
            secondBox: '0',
            thirdBox: '0',
            fourthBox: '$a C377026 Black Panther $b Numeration $c (Fictitious character) $c second title $d Dates associated with a name $g Miscellaneous information $j Attribution qualifier $q Fuller form of name $f Date of a work $h Medium $k Form subheading $l Language of a work $m Medium of performance for music $n Number of part/section of a work $o Arranged statement for music $p Name of part/section of a work $r Key for music $s Version $t Wakanda Forever $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision',
            fifthBox: '$i comics',
            sixthBox: '$0 http://id.loc.gov/authorities/names/n2016004082',
            seventhBox: '$4 .prt $2 test',
          },
          {
            searchValue: 'C377026 Radio Roma. Hrvatski program Location of meeting Date',
            rowIndex: 46,
            tagValue: '610',
            secondBox: '\\',
            thirdBox: '\\',
            fourthBox: '$a C377026 Radio Roma. $b Hrvatski program $c Location of meeting $d Date of meeting or treaty signing $g Miscellaneous information $f Date of a work $h Medium $k Form subheading $l Language of a work $m Medium of performance for music $n Number of part/section/meeting $o Arranged statement for music $p Name of part/section of a work $r Key for music $s Version $t Title of a work $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision',
            fifthBox: '',
            sixthBox: '$0 4510955',
            seventhBox: '',
          },
          {
            searchValue: 'C377026 Roma Council Location of meeting Date of meeting',
            rowIndex: 47,
            tagValue: '611',
            secondBox: '\\',
            thirdBox: '\\',
            fourthBox: '$a C377026 Roma Council $c Location of meeting $e Subordinate unit $q Name of meeting following jurisdiction name entry element $f Date of a work $h Medium $k Form subheading $l Language of a work $p Name of part/section of a work $s Version $t Title of a work $d Date of meeting or treaty signing $g Miscellaneous information $n Number of part/section/meeting $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision',
            fifthBox: '',
            sixthBox: '$0 http://id.loc.gov/authorities/names/n79084170',
            seventhBox: '',
          },
          {
            searchValue: 'C377026 Marvel comics Date of treaty signing Date',
            rowIndex: 48,
            tagValue: '630',
            secondBox: '\\',
            thirdBox: '\\',
            fourthBox: '$a C377026 Marvel comics $d Date of treaty signing $f Date of a work $g Miscellaneous information $h Medium $k Form subheading $l Language of a work $m Medium of performance for music $n Number of part/section of a work $o Arranged statement for music $p Name of part/section of a work $r Key for music $s Version $t Title of a work $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision',
            fifthBox: '',
            sixthBox: '$0 http://id.loc.gov/authorities/names/n80026955',
            seventhBox: '',
          },
          {
            searchValue: 'C377026 Speaking Oratory debating Form subdivision',
            rowIndex: 49,
            tagValue: '650',
            secondBox: '\\',
            thirdBox: '\\',
            fourthBox: '$a C377026 Speaking Oratory $b debating $g Miscellaneous information $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision',
            fifthBox: '',
            sixthBox: '$0 http://id.loc.gov/authorities/subjects/sh85095298',
            seventhBox: '',
          },
          {
            searchValue: 'C377026 Clear Creek (Tex.) Place in Texas Form subdivision',
            rowIndex: 50,
            tagValue: '651',
            secondBox: '\\',
            thirdBox: '\\',
            fourthBox: '$a C377026 Clear Creek (Tex.) $g Place in Texas $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision',
            fifthBox: '',
            sixthBox: '$0 http://id.loc.gov/authorities/names/n79041363',
            seventhBox: '',
          },
          {
            searchValue: 'C377026 Drama Form subdivision General subdivision',
            rowIndex: 51,
            tagValue: '655',
            secondBox: '\\',
            thirdBox: '\\',
            fourthBox: '$a C377026 Drama $v Form subdivision $x General subdivision $y Chronological subdivision $z Geographic subdivision',
            fifthBox: '',
            sixthBox: '$0 http://id.loc.gov/authorities/genreForms/gf2014026297',
            seventhBox: '',
          },
        ];

        before('Creating user and data', () => {
          cy.getAdminToken();
          // make sure there are no duplicate authority records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C377026*');

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ]).then((createdUserProperties) => {
            testData.userProperties = createdUserProperties;

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

            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });

        after('Deleting created user and data', () => {
          cy.getAdminToken();
          Users.deleteViaApi(testData.userProperties.userId);
          createdRecordIDs.forEach((id, index) => {
            if (index) MarcAuthority.deleteViaAPI(id);
            else InventoryInstance.deleteInstanceViaApi(id);
          });
        });

        it(
          'C377026 Link the "600" of "MARC Bib" field to "MARC Authority" record (with "v", "x", "y", "z" subfields). (spitfire) (TaaS)',
          { tags: ['extendedPath', 'spitfire'] },
          () => {
            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            bib6XXAfterLinkingToAuth1XX.forEach((field) => {
              InventoryInstance.verifyAndClickLinkIcon(field.tagValue);
              MarcAuthorities.switchToSearch();
              InventoryInstance.verifySelectMarcAuthorityModal();
              InventoryInstance.searchResults(field.searchValue);
              InventoryInstance.clickLinkButton();
              QuickMarcEditor.verifyAfterLinkingAuthority(field.tagValue);
              QuickMarcEditor.verifyTagFieldAfterLinking(
                field.rowIndex,
                field.tagValue,
                field.secondBox,
                field.thirdBox,
                field.fourthBox,
                field.fifthBox,
                field.sixthBox,
                field.seventhBox,
              );
            });

            QuickMarcEditor.clickSaveAndKeepEditingButton();
            cy.wait(1500);
            QuickMarcEditor.pressSaveAndKeepEditing(testData.calloutUpdatedRecord);
            bib6XXAfterLinkingToAuth1XX.forEach((field) => {
              QuickMarcEditor.verifyTagFieldAfterLinking(
                field.rowIndex,
                field.tagValue,
                field.secondBox,
                field.thirdBox,
                field.fourthBox,
                field.fifthBox,
                field.sixthBox,
                field.seventhBox,
              );
            });
          },
        );
      });
    });
  });
});
